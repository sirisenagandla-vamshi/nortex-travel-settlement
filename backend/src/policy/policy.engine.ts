import { rupeesToPaise } from './money';
import { ApprovalBand, PolicyLine, Role, TripContext } from './types';

const TIER1_CITIES = [
  'BENGALURU',
  'BANGALORE',
  'MUMBAI',
  'DELHI',
  'DELHI NCR',
  'HYDERABAD',
  'CHENNAI',
  'PUNE',
  'KOLKATA',
];

export const LODGING_LIMIT_PAISE: Record<TripContext['cityClass'], number> = {
  TIER_1: rupeesToPaise(6000),
  TIER_2: rupeesToPaise(4000),
  TIER_3: rupeesToPaise(2800),
};

export const MEAL_LIMIT_PAISE: Record<TripContext['cityClass'], number> = {
  TIER_1: rupeesToPaise(1500),
  TIER_2: rupeesToPaise(1000),
  TIER_3: rupeesToPaise(1000),
};

export const ENTERTAINMENT_HOD_PREAPPROVAL_PAISE = rupeesToPaise(2000);
export const MEAL_BILL_REQUIRED_PAISE = rupeesToPaise(500);
export const ADVANCE_MAX_FRACTION = 0.6;

export function cityClassFor(city: string): TripContext['cityClass'] {
  const key = city.trim().toUpperCase();
  return TIER1_CITIES.includes(key) ? 'TIER_1' : 'TIER_2';
}

export function tripDayCount(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.max(days, 1);
}

/**
 * Approval matrix from NTX-HR-POL-11 §2.
 * Finance is always required after business approvals and is not in this list.
 */
export function approvalBand(claimedPaise: number): ApprovalBand {
  if (claimedPaise <= rupeesToPaise(25000)) {
    return { roles: ['REPORTING_MANAGER'], label: 'Reporting Manager' };
  }
  if (claimedPaise <= rupeesToPaise(75000)) {
    return {
      roles: ['REPORTING_MANAGER', 'HEAD_OF_DEPARTMENT'],
      label: 'Reporting Manager, Head of Department',
    };
  }
  if (claimedPaise <= rupeesToPaise(200000)) {
    return {
      roles: ['REPORTING_MANAGER', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DIVISION'],
      label: 'Reporting Manager, Head of Department, Head of Division',
    };
  }
  return {
    roles: ['REPORTING_MANAGER', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DIVISION', 'MD'],
    label: 'Full chain including MD/CEO',
  };
}

export function nextBusinessStatus(role: Role): 'PENDING_HOD' | 'PENDING_FINANCE' {
  return role === 'REPORTING_MANAGER' ? 'PENDING_HOD' : 'PENDING_FINANCE';
}

export function advanceWithinPolicy(advancePaise: number, estimatedPaise: number): boolean {
  return advancePaise <= Math.round(estimatedPaise * ADVANCE_MAX_FRACTION);
}

export function applyLodgingLimit(line: PolicyLine, ctx: TripContext): PolicyLine {
  if (line.category !== 'LODGING' || ctx.nightsBooked <= 0) return line;
  const limit = LODGING_LIMIT_PAISE[ctx.cityClass] * ctx.nightsBooked;
  if (line.reimbursablePaise <= limit) {
    return {
      ...line,
      flags: [
        ...line.flags,
        `Within lodging cap of ₹${limit / 100}/stay (${ctx.cityClass.replace('_', ' ')}, ${ctx.nightsBooked} nights).`,
      ],
    };
  }
  const excess = line.reimbursablePaise - limit;
  return {
    ...line,
    reimbursablePaise: limit,
    disallowedPaise: line.disallowedPaise + excess,
    flags: [
      ...line.flags,
      `Room tariff exceeds ${ctx.cityClass.replace('_', ' ')} cap. Excess ₹${(excess / 100).toFixed(2)} disallowed, not omitted.`,
    ],
  };
}

export function applyMealCap(lines: PolicyLine[], ctx: TripContext): PolicyLine[] {
  const days = tripDayCount(ctx.startDate, ctx.endDate);
  const cap = MEAL_LIMIT_PAISE[ctx.cityClass] * days;
  let used = 0;
  return lines.map((line) => {
    if (line.category !== 'MEALS' || !line.included) return line;
    const room = cap - used;
    if (line.reimbursablePaise > rupeesToPaise(500) && !line.proofRef) {
      return {
        ...line,
        flags: [...line.flags, 'Meal above ₹500 needs a bill — line will be returned if submitted without proof.'],
      };
    }
    if (line.reimbursablePaise <= room) {
      used += line.reimbursablePaise;
      return {
        ...line,
        flags: [...line.flags, `Meals on actuals; trip cap ₹${(cap / 100).toFixed(2)} across ${days} travel days.`],
      };
    }
    const allowed = Math.max(room, 0);
    const excess = line.reimbursablePaise - allowed;
    used += allowed;
    return {
      ...line,
      reimbursablePaise: allowed,
      disallowedPaise: line.disallowedPaise + excess,
      flags: [...line.flags, `Meal cap exceeded. Excess ₹${(excess / 100).toFixed(2)} disallowed.`],
    };
  });
}

export function applyEntertainmentRule(line: PolicyLine): PolicyLine {
  if (line.category !== 'BUSINESS_ENTERTAINMENT') return line;
  const flags = [
    ...line.flags,
    'Business entertainment is not meal allowance. Attendee names and organisation are required.',
  ];
  if (line.claimedPaise > ENTERTAINMENT_HOD_PREAPPROVAL_PAISE) {
    flags.push(
      'Amount is above ₹2,000 so Head of Department prior approval is required. Flagged because the inbox has no pre-approval mail.',
    );
  }
  return { ...line, flags };
}

export function applyNightGap(lines: PolicyLine[], ctx: TripContext): PolicyLine[] {
  if (ctx.nightsBooked >= ctx.nightsRequested) return lines;
  const lodging = lines.find((l) => l.category === 'LODGING');
  if (!lodging) return lines;
  return lines.map((line) =>
    line === lodging
      ? {
          ...line,
          flags: [
            ...line.flags,
            `Travel request asked for ${ctx.nightsRequested} nights but the hotel billed ${ctx.nightsBooked}. Gap flagged — a 4th night was not invented.`,
          ],
        }
      : line,
  );
}

export function totals(lines: PolicyLine[]) {
  const included = lines.filter((l) => l.included);
  const claimedPaise = included.reduce((s, l) => s + l.claimedPaise, 0);
  const reimbursablePaise = included.reduce((s, l) => s + l.reimbursablePaise, 0);
  const disallowedPaise = included.reduce((s, l) => s + l.disallowedPaise, 0);
  return { claimedPaise, reimbursablePaise, disallowedPaise };
}

export function netPayable(reimbursablePaise: number, advanceDisbursedPaise: number) {
  return reimbursablePaise - advanceDisbursedPaise;
}

export function applyPolicy(lines: PolicyLine[], ctx: TripContext): PolicyLine[] {
  const withLodging = lines.map((line) => applyLodgingLimit(line, ctx));
  const withMeals = applyMealCap(withLodging, ctx);
  const withEnt = withMeals.map(applyEntertainmentRule);
  return applyNightGap(withEnt, ctx);
}
