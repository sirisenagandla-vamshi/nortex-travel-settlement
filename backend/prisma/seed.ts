import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { packDir } from '../src/pack-path';
import { classifyEmail, parseEml } from '../src/policy/email.classifier';
import { buildChaitanyaSettlement, CHAITANYA_TRIP } from '../src/policy/settlement.builder';

const prisma = new PrismaClient();

const ROLE_MAP: Record<string, Role> = {
  Employee: 'EMPLOYEE',
  'Reporting Manager': 'REPORTING_MANAGER',
  'Head of Department': 'HEAD_OF_DEPARTMENT',
  'Head of Division': 'HEAD_OF_DIVISION',
  MD: 'MD',
  Finance: 'FINANCE',
};


function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cols[i] ?? ''));
    return row;
  });
}

function parseEmailDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date('2026-06-08T11:12:04+05:30') : d;
}

async function main() {
  console.log('Seeding Nortex trip for Chaitanya Reddy...');

  await prisma.approvalStep.deleteMany();
  await prisma.expenseLine.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.inboxMessage.deleteMany();
  await prisma.travelRequest.deleteMany();
  await prisma.user.deleteMany();

  const csv = fs.readFileSync(path.join(packDir(), 'employee_master.csv'), 'utf8');
  const people = parseCsv(csv);

  for (const row of people) {
    const passwordHash = await bcrypt.hash(row.emp_code, 10);
    await prisma.user.create({
      data: {
        empCode: row.emp_code,
        name: row.name,
        email: row.email,
        passwordHash,
        designation: row.designation,
        department: row.department,
        costCentre: row.cost_centre,
        city: row.city,
        role: ROLE_MAP[row.role] ?? 'EMPLOYEE',
        reportingManagerCode: row.reporting_manager_code || null,
      },
    });
  }

  const chaitanya = await prisma.user.findUniqueOrThrow({ where: { empCode: 'NX-4471' } });

  const travel = await prisma.travelRequest.create({
    data: {
      travelRequestId: 'TR-2026-0616',
      claimantId: chaitanya.id,
      purpose: 'Vertex account review and plant visit',
      destination: CHAITANYA_TRIP.destination,
      cityClass: CHAITANYA_TRIP.cityClass,
      startDate: new Date('2026-06-16T00:00:00+05:30'),
      endDate: new Date('2026-06-20T00:00:00+05:30'),
      estimatedPaise: CHAITANYA_TRIP.estimatedPaise,
      advanceRequested: CHAITANYA_TRIP.advanceDisbursedPaise,
      advanceDisbursed: CHAITANYA_TRIP.advanceDisbursedPaise,
      advanceRef: 'ADV/2026/0619',
      nightsRequested: CHAITANYA_TRIP.nightsRequested,
      nightsBooked: CHAITANYA_TRIP.nightsBooked,
    },
  });

  const emailDir = path.join(packDir(), 'sample_emails');
  const files = fs.readdirSync(emailDir).filter((f) => f.endsWith('.eml')).sort();
  const inboxIds: Record<string, string> = {};

  for (const filename of files) {
    const raw = fs.readFileSync(path.join(emailDir, filename), 'utf8');
    const parsed = parseEml(filename, raw);
    const classified = classifyEmail(parsed);
    const created = await prisma.inboxMessage.create({
      data: {
        travelRequestId: travel.id,
        filename,
        subject: classified.subject,
        fromAddr: classified.fromAddr,
        receivedAt: parseEmailDate(classified.date),
        body: classified.body.slice(0, 4000),
        classification: classified.classification,
        reason: classified.reason,
      },
    });
    inboxIds[filename] = created.id;
  }

  const settlement = buildChaitanyaSettlement();

  const claim = await prisma.claim.create({
    data: {
      claimNumber: 'CLM-2026-000049',
      travelRequestId: travel.id,
      claimantId: chaitanya.id,
      status: 'DRAFT',
      claimedPaise: settlement.claimedPaise,
      reimbursablePaise: settlement.reimbursablePaise,
      disallowedPaise: settlement.disallowedPaise,
      advanceAppliedPaise: settlement.advanceAppliedPaise,
      payablePaise: settlement.payablePaise,
    },
  });

  for (const line of settlement.lines) {
    await prisma.expenseLine.create({
      data: {
        claimId: claim.id,
        inboxMessageId: line.sourceFilename ? inboxIds[line.sourceFilename] ?? null : null,
        category: line.category,
        merchant: line.merchant,
        description: line.description,
        incurredOn: new Date(line.incurredOn + 'T00:00:00+05:30'),
        claimedPaise: line.claimedPaise,
        reimbursablePaise: line.reimbursablePaise,
        disallowedPaise: line.disallowedPaise,
        proofRef: line.proofRef,
        included: line.included,
        flags: line.flags,
      },
    });
  }

  console.log('Travel request', travel.travelRequestId);
  console.log('Claim', claim.claimNumber);
  console.log('Inbox messages', files.length);
  console.log('Settlement lines', settlement.lines.length);
  console.log('Reimbursable paise', settlement.reimbursablePaise);
  console.log('Net payable paise', settlement.payablePaise);
  console.log('Demo logins: email from CSV, password = emp_code (e.g. NX-4471)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
