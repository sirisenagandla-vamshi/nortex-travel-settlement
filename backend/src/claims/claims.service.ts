import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClaimStatus, Prisma, Role } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import type { AuthUser } from '../auth/current-user';
import { packDir } from '../pack-path';
import { classifyEmail, parseEml } from '../policy/email.classifier';
import { rupeesToPaise } from '../policy/money';
import { advanceWithinPolicy, approvalBand, cityClassFor } from '../policy/policy.engine';
import { buildChaitanyaSettlement } from '../policy/settlement.builder';
import { PrismaService } from '../prisma/prisma.service';

const CLAIM_INCLUDE = {
  claimant: {
    select: {
      id: true,
      empCode: true,
      name: true,
      email: true,
      role: true,
      designation: true,
      department: true,
      costCentre: true,
    },
  },
  travelRequest: true,
  lines: { orderBy: { incurredOn: 'asc' as const } },
  approvals: {
    orderBy: { stepOrder: 'asc' as const },
    include: {
      assignee: {
        select: { id: true, empCode: true, name: true, role: true, designation: true },
      },
    },
  },
} satisfies Prisma.ClaimInclude;

@Injectable()
export class ClaimsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(
    user: AuthUser,
    body: {
      category: string;
      purpose: string;
      destination: string;
      departureDate: string;
      numberOfDays: number;
      modeOfTransport: string;
      estimatedRupees: number;
      advanceRupees: number;
    },
  ) {
    if (user.role !== 'EMPLOYEE') {
      throw new ForbiddenException('Only employees raise travel requests');
    }
    if (body.category !== 'DOMESTIC_TRAVEL') {
      throw new BadRequestException('For this pack, select Domestic travel. Other categories are not in the Nortex spec.');
    }
    if (body.numberOfDays < 1) throw new BadRequestException('Number of days must be at least 1');
    const estimatedPaise = rupeesToPaise(body.estimatedRupees);
    const advancePaise = rupeesToPaise(body.advanceRupees || 0);
    if (!advanceWithinPolicy(advancePaise, estimatedPaise)) {
      throw new BadRequestException('Advance cannot exceed 60% of estimated employee-borne cost (policy §1.2)');
    }

    const start = new Date(`${body.departureDate}T00:00:00+05:30`);
    if (Number.isNaN(start.getTime())) throw new BadRequestException('Invalid departure date');
    const end = new Date(start);
    end.setDate(end.getDate() + body.numberOfDays - 1);
    const nightsRequested = Math.max(body.numberOfDays - 1, 0);
    const seq = (await this.prisma.claim.count()) + 1;
    const travelRequestId = `TR-2026-${String(seq).padStart(4, '0')}`;
    const claimNumber = `CLM-2026-${String(seq).padStart(6, '0')}`;

    const travel = await this.prisma.travelRequest.create({
      data: {
        travelRequestId,
        claimantId: user.sub,
        purpose: body.purpose,
        destination: body.destination,
        cityClass: cityClassFor(body.destination),
        startDate: start,
        endDate: end,
        estimatedPaise,
        advanceRequested: advancePaise,
        advanceDisbursed: 0,
        nightsRequested,
        nightsBooked: 0,
      },
    });

    const claim = await this.prisma.claim.create({
      data: {
        claimNumber,
        travelRequestId: travel.id,
        claimantId: user.sub,
        status: 'PENDING_RM',
        claimedPaise: estimatedPaise,
        reimbursablePaise: estimatedPaise,
        employeeNotes: `Mode: ${body.modeOfTransport}`,
      },
    });

    const rmRoles: Role[] = ['REPORTING_MANAGER'];
    const chain = await this.resolveApprovers(user.sub, rmRoles);
    await this.prisma.approvalStep.createMany({
      data: chain.map((step, i) => ({
        claimId: claim.id,
        stepOrder: i + 1,
        role: step.role,
        assigneeId: step.id,
        action: 'PENDING' as const,
      })),
    });

    return this.prisma.claim.findUniqueOrThrow({ where: { id: claim.id }, include: CLAIM_INCLUDE });
  }

  async listForUser(user: AuthUser) {
    if (user.role === 'EMPLOYEE') {
      return this.prisma.claim.findMany({
        where: { claimantId: user.sub },
        include: CLAIM_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
    }
    if (
      user.role === 'REPORTING_MANAGER' ||
      user.role === 'HEAD_OF_DEPARTMENT' ||
      user.role === 'HEAD_OF_DIVISION' ||
      user.role === 'MD'
    ) {
      return this.prisma.claim.findMany({
        where: {
          OR: [
            { claimant: { reportingManagerCode: user.empCode } },
            { approvals: { some: { assigneeId: user.sub } } },
          ],
        },
        include: CLAIM_INCLUDE,
        orderBy: { updatedAt: 'desc' },
      });
    }
    return this.prisma.claim.findMany({
      include: CLAIM_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(id: string, user: AuthUser) {
    const claim = await this.prisma.claim.findUnique({
      where: { id },
      include: CLAIM_INCLUDE,
    });
    if (!claim) throw new NotFoundException('Claim not found');
    this.assertCanView(claim, user);
    return claim;
  }

  async inbox(user: AuthUser) {
    const claim = await this.prisma.claim.findFirst({
      where: user.role === 'EMPLOYEE' ? { claimantId: user.sub } : {},
      orderBy: { createdAt: 'desc' },
      include: CLAIM_INCLUDE,
    });
    if (!claim) return [];
    return this.prisma.inboxMessage.findMany({
      where: { travelRequestId: claim.travelRequestId },
      orderBy: { receivedAt: 'asc' },
    });
  }

  async toggleLine(claimId: string, lineId: string, included: boolean, user: AuthUser) {
    const claim = await this.get(claimId, user);
    if (claim.claimantId !== user.sub) throw new ForbiddenException('Only the claimant can edit lines');
    if (claim.status !== 'DRAFT' && claim.status !== 'RETURNED') {
      throw new BadRequestException('Lines are locked after submission');
    }
    await this.prisma.expenseLine.update({
      where: { id: lineId },
      data: { included },
    });
    return this.recompute(claimId);
  }

  async submit(claimId: string, notes: string | undefined, user: AuthUser) {
    const claim = await this.get(claimId, user);
    if (claim.claimantId !== user.sub) throw new ForbiddenException();
    if (claim.status !== 'DRAFT' && claim.status !== 'RETURNED') {
      throw new BadRequestException('This claim is not waiting on you');
    }
    const included = claim.lines.filter((l) => l.included);
    if (included.length === 0) throw new BadRequestException('Select at least one line');
    const missingProof = included.filter((l) => !l.proofRef);
    if (missingProof.length) {
      throw new BadRequestException('Every included line needs a supporting document (policy §5.2)');
    }

    const recomputed = await this.recompute(claimId);
    const band = approvalBand(recomputed.reimbursablePaise);
    const chain = await this.resolveApprovers(claim.claimantId, band.roles);

    await this.prisma.approvalStep.deleteMany({ where: { claimId } });
    await this.prisma.approvalStep.createMany({
      data: chain.map((step, i) => ({
        claimId,
        stepOrder: i + 1,
        role: step.role,
        assigneeId: step.id,
        action: 'PENDING' as const,
      })),
    });

    const first = chain[0];
    const status: ClaimStatus =
      first.role === 'REPORTING_MANAGER' ? 'PENDING_RM' : 'PENDING_HOD';

    return this.prisma.claim.update({
      where: { id: claimId },
      data: {
        status,
        employeeNotes: notes,
        submittedAt: new Date(),
      },
      include: CLAIM_INCLUDE,
    });
  }

  async decide(
    claimId: string,
    action: 'APPROVED' | 'RETURNED' | 'REJECTED',
    remarks: string | undefined,
    user: AuthUser,
  ) {
    const claim = await this.get(claimId, user);
    const pending = claim.approvals.find((s) => s.action === 'PENDING');
    if (!pending) throw new BadRequestException('No pending approval step');
    if (pending.assigneeId !== user.sub) {
      throw new ForbiddenException('This step is not assigned to you');
    }
    if (claim.claimantId === user.sub) {
      throw new ForbiddenException('You cannot approve your own claim');
    }
    if (action !== 'APPROVED' && !remarks?.trim()) {
      throw new BadRequestException('Remarks are required when returning or rejecting');
    }

    await this.prisma.approvalStep.update({
      where: { id: pending.id },
      data: { action, remarks: remarks?.trim() || null, actedAt: new Date() },
    });

    if (action === 'REJECTED') {
      return this.prisma.claim.update({
        where: { id: claimId },
        data: { status: 'REJECTED' },
        include: CLAIM_INCLUDE,
      });
    }
    if (action === 'RETURNED') {
      await this.prisma.approvalStep.updateMany({
        where: { claimId, action: 'PENDING' },
        data: { action: 'SKIPPED' },
      });
      return this.prisma.claim.update({
        where: { id: claimId },
        data: { status: 'RETURNED' },
        include: CLAIM_INCLUDE,
      });
    }

    const remaining = await this.prisma.approvalStep.findFirst({
      where: { claimId, action: 'PENDING' },
      orderBy: { stepOrder: 'asc' },
    });

    if (!remaining && claim.lines.length === 0) {
      return this.releaseToSettlement(claimId);
    }

    const nextStatus: ClaimStatus = remaining
      ? remaining.role === 'HEAD_OF_DEPARTMENT'
        ? 'PENDING_HOD'
        : remaining.role === 'REPORTING_MANAGER'
          ? 'PENDING_RM'
          : 'PENDING_FINANCE'
      : 'PENDING_FINANCE';

    return this.prisma.claim.update({
      where: { id: claimId },
      data: { status: nextStatus },
      include: CLAIM_INCLUDE,
    });
  }

  async financeVerify(claimId: string, notes: string | undefined, user: AuthUser) {
    if (user.role !== 'FINANCE') throw new ForbiddenException('Finance only');
    const claim = await this.get(claimId, user);
    if (claim.status !== 'PENDING_FINANCE') {
      throw new BadRequestException('Claim is not in finance review');
    }
    return this.prisma.claim.update({
      where: { id: claimId },
      data: {
        status: 'READY_TO_PAY',
        financeNotes: notes?.trim() || 'Verified. Queued for the 10th/25th payment run.',
      },
      include: CLAIM_INCLUDE,
    });
  }

  async markPaid(claimId: string, user: AuthUser) {
    if (user.role !== 'FINANCE') throw new ForbiddenException('Finance only');
    const claim = await this.get(claimId, user);
    if (claim.status !== 'READY_TO_PAY') {
      throw new BadRequestException('Claim is not ready to pay');
    }
    return this.prisma.claim.update({
      where: { id: claimId },
      data: { status: 'PAID' },
      include: CLAIM_INCLUDE,
    });
  }

  async approvalsQueue(user: AuthUser) {
    return this.prisma.claim.findMany({
      where: {
        approvals: { some: { assigneeId: user.sub, action: 'PENDING' } },
        status: { in: ['PENDING_RM', 'PENDING_HOD'] },
      },
      include: CLAIM_INCLUDE,
      orderBy: { submittedAt: 'asc' },
    });
  }

  async financeQueue() {
    return this.prisma.claim.findMany({
      where: { status: { in: ['PENDING_FINANCE', 'READY_TO_PAY'] } },
      include: CLAIM_INCLUDE,
      orderBy: { updatedAt: 'asc' },
    });
  }

  async dashboard(user: AuthUser) {
    const claims = await this.listForUser(user);
    const mine = claims.filter((c) => c.claimantId === user.sub);
    const queue = claims.filter(
      (c) =>
        (c.status === 'PENDING_RM' || c.status === 'PENDING_HOD') &&
        c.approvals.some((a) => a.assigneeId === user.sub && a.action === 'PENDING'),
    );
    const finance = claims.filter((c) => c.status === 'PENDING_FINANCE' || c.status === 'READY_TO_PAY');
    return {
      needsAttention: mine.filter((c) => c.status === 'RETURNED' || c.status === 'DRAFT').length,
      inProgress: mine.filter((c) =>
        ['PENDING_RM', 'PENDING_HOD', 'PENDING_FINANCE', 'READY_TO_PAY'].includes(c.status),
      ).length,
      toApprove: queue.length,
      toVerify: finance.filter((c) => c.status === 'PENDING_FINANCE').length,
      reimbursedPaise: mine
        .filter((c) => c.status === 'PAID')
        .reduce((s, c) => s + Math.max(c.payablePaise, 0), 0),
      primaryClaimId: mine[0]?.id ?? claims[0]?.id ?? null,
    };
  }

  private async releaseToSettlement(claimId: string) {
    const claim = await this.prisma.claim.findUniqueOrThrow({
      where: { id: claimId },
      include: { travelRequest: true, claimant: true },
    });
    const advance = Math.min(
      claim.travelRequest.advanceRequested,
      Math.round(claim.travelRequest.estimatedPaise * 0.6),
    );
    const packTrip = claim.travelRequest.destination.toLowerCase().includes('bengaluru');

    await this.prisma.travelRequest.update({
      where: { id: claim.travelRequestId },
      data: {
        advanceDisbursed: advance,
        advanceRef: advance ? `ADV/2026/${claim.claimNumber.slice(-4)}` : null,
        nightsBooked: packTrip ? 3 : claim.travelRequest.nightsRequested,
      },
    });

    if (packTrip) {
      await this.attachPackInbox(claim.travelRequestId, claim.id);
    }

    await this.recompute(claimId);
    return this.prisma.claim.update({
      where: { id: claimId },
      data: { status: 'DRAFT' },
      include: CLAIM_INCLUDE,
    });
  }

  private async attachPackInbox(travelRequestId: string, claimId: string) {
    const emailDir = path.join(packDir(), 'sample_emails');
    const files = fs.readdirSync(emailDir).filter((f) => f.endsWith('.eml')).sort();
    const inboxIds: Record<string, string> = {};
    for (const filename of files) {
      const raw = fs.readFileSync(path.join(emailDir, filename), 'utf8');
      const classified = classifyEmail(parseEml(filename, raw));
      const created = await this.prisma.inboxMessage.create({
        data: {
          travelRequestId,
          filename,
          subject: classified.subject,
          fromAddr: classified.fromAddr,
          receivedAt: new Date(classified.date || '2026-06-16T00:00:00+05:30'),
          body: classified.body.slice(0, 4000),
          classification: classified.classification,
          reason: classified.reason,
        },
      });
      inboxIds[filename] = created.id;
    }

    const settlement = buildChaitanyaSettlement();
    for (const line of settlement.lines) {
      await this.prisma.expenseLine.create({
        data: {
          claimId,
          inboxMessageId: line.sourceFilename ? inboxIds[line.sourceFilename] ?? null : null,
          category: line.category,
          merchant: line.merchant,
          description: line.description,
          incurredOn: new Date(`${line.incurredOn}T00:00:00+05:30`),
          claimedPaise: line.claimedPaise,
          reimbursablePaise: line.reimbursablePaise,
          disallowedPaise: line.disallowedPaise,
          proofRef: line.proofRef,
          included: line.included,
          flags: line.flags,
        },
      });
    }
  }

  private async primaryClaim(user: AuthUser) {
    const claim = await this.prisma.claim.findFirst({
      where: user.role === 'EMPLOYEE' ? { claimantId: user.sub } : {},
      orderBy: { createdAt: 'desc' },
      include: CLAIM_INCLUDE,
    });
    if (!claim) throw new NotFoundException('No claim seeded yet. Run npm run seed.');
    return claim;
  }

  private async recompute(claimId: string) {
    const claim = await this.prisma.claim.findUniqueOrThrow({
      where: { id: claimId },
      include: { lines: true, travelRequest: true },
    });
    const included = claim.lines.filter((l) => l.included);
    const claimedPaise = included.reduce((s, l) => s + l.claimedPaise, 0);
    const reimbursablePaise = included.reduce((s, l) => s + l.reimbursablePaise, 0);
    const disallowedPaise = included.reduce((s, l) => s + l.disallowedPaise, 0);
    const advanceAppliedPaise = claim.travelRequest.advanceDisbursed;
    const payablePaise = reimbursablePaise - advanceAppliedPaise;
    return this.prisma.claim.update({
      where: { id: claimId },
      data: { claimedPaise, reimbursablePaise, disallowedPaise, advanceAppliedPaise, payablePaise },
      include: CLAIM_INCLUDE,
    });
  }

  private async resolveApprovers(claimantId: string, roles: Role[]) {
    const claimant = await this.prisma.user.findUniqueOrThrow({ where: { id: claimantId } });
    const byCode = async (code: string | null) =>
      code ? this.prisma.user.findUnique({ where: { empCode: code } }) : null;

    const rm = await byCode(claimant.reportingManagerCode);
    const people: { role: Role; id: string }[] = [];
    let cursor = rm;
    for (const role of roles) {
      while (cursor && cursor.role !== role) {
        cursor = await byCode(cursor.reportingManagerCode);
      }
      if (!cursor) throw new BadRequestException(`No ${role} in the reporting chain`);
      if (cursor.id === claimantId) {
        cursor = await byCode(cursor.reportingManagerCode);
        continue;
      }
      people.push({ role, id: cursor.id });
      cursor = await byCode(cursor.reportingManagerCode);
    }
    return people;
  }

  private assertCanView(
    claim: { claimantId: string; approvals: { assigneeId: string }[] },
    user: AuthUser,
  ) {
    if (user.role === 'FINANCE' || user.role === 'MD') return;
    if (claim.claimantId === user.sub) return;
    if (claim.approvals.some((a) => a.assigneeId === user.sub)) return;
    if (user.role === 'REPORTING_MANAGER' || user.role === 'HEAD_OF_DEPARTMENT') return;
    throw new ForbiddenException();
  }
}
