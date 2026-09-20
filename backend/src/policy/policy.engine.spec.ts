import { rupeesToPaise } from './money';
import {
  advanceWithinPolicy,
  approvalBand,
  applyPolicy,
  cityClassFor,
  netPayable,
  totals,
  tripDayCount,
} from './policy.engine';
import { buildChaitanyaSettlement, CHAITANYA_TRIP, hotelFolioLines } from './settlement.builder';
import { PolicyLine } from './types';
import { classifyEmail, parseEml } from './email.classifier';

describe('policy engine', () => {
  it('classifies Bengaluru as Tier 1', () => {
    expect(cityClassFor('Bengaluru')).toBe('TIER_1');
    expect(cityClassFor('Nagpur')).toBe('TIER_2');
  });

  it('counts travel days as full days including both ends', () => {
    expect(tripDayCount('2026-06-16', '2026-06-20')).toBe(5);
  });

  it('caps advance at 60% of estimate', () => {
    expect(advanceWithinPolicy(rupeesToPaise(20000), rupeesToPaise(48000))).toBe(true);
    expect(advanceWithinPolicy(rupeesToPaise(30000), rupeesToPaise(48000))).toBe(false);
  });

  it('routes ₹26k claims through RM and HoD', () => {
    const band = approvalBand(rupeesToPaise(26688));
    expect(band.roles).toEqual(['REPORTING_MANAGER', 'HEAD_OF_DEPARTMENT']);
  });

  it('shows laundry and minibar as disallowed instead of dropping them', () => {
    const folio = hotelFolioLines();
    const laundry = folio.find((l) => l.description.startsWith('Laundry'));
    const minibar = folio.find((l) => l.description.startsWith('Mini bar'));
    expect(laundry?.reimbursablePaise).toBe(0);
    expect(laundry?.disallowedPaise).toBeGreaterThan(0);
    expect(minibar?.reimbursablePaise).toBe(0);
    expect(minibar?.disallowedPaise).toBeGreaterThan(0);
    const sum =
      folio.reduce((s, l) => s + l.claimedPaise, 0);
    expect(sum).toBe(rupeesToPaise(21504));
  });

  it('disallows lodging over the nightly cap without omitting the line', () => {
    const line: PolicyLine = {
      category: 'LODGING',
      merchant: 'Overpriced Inn',
      description: '1 night',
      incurredOn: '2026-06-16',
      claimedPaise: rupeesToPaise(8000),
      reimbursablePaise: rupeesToPaise(8000),
      disallowedPaise: 0,
      proofRef: 'x',
      included: true,
      flags: [],
    };
    const [out] = applyPolicy([line], { ...CHAITANYA_TRIP, nightsBooked: 1, nightsRequested: 1 });
    expect(out.reimbursablePaise).toBe(rupeesToPaise(6000));
    expect(out.disallowedPaise).toBe(rupeesToPaise(2000));
    expect(out.claimedPaise).toBe(rupeesToPaise(8000));
  });

  it('builds Chaitanya settlement with advance recovery and night-gap flag', () => {
    const draft = buildChaitanyaSettlement();
    expect(draft.reimbursablePaise).toBeGreaterThan(rupeesToPaise(25000));
    expect(draft.reimbursablePaise).toBeLessThan(rupeesToPaise(30000));
    expect(draft.disallowedPaise).toBeGreaterThan(0);
    expect(draft.payablePaise).toBe(netPayable(draft.reimbursablePaise, rupeesToPaise(20000)));
    expect(draft.payablePaise).toBeGreaterThan(0);
    const lodging = draft.lines.find((l) => l.category === 'LODGING');
    expect(lodging?.flags.some((f) => f.includes('4th night'))).toBe(true);
    const dinner = draft.lines.find((l) => l.category === 'BUSINESS_ENTERTAINMENT');
    expect(dinner?.flags.some((f) => f.includes('prior approval'))).toBe(true);
    const { reimbursablePaise } = totals(draft.lines);
    expect(reimbursablePaise).toBe(draft.reimbursablePaise);
  });
});

describe('inbox classifier', () => {
  it('excludes company-paid flights', () => {
    const parsed = parseEml(
      '04_flight_eticket.eml',
      `Subject: E-Ticket for Your Flight Booking\nFrom: MakeMyTrip <noreply@makemytrip.com>\n\nPayment: Corporate Card ending 4417 (Nortex Industries Ltd)\n`,
    );
    expect(classifyEmail(parsed).classification).toBe('EXCLUDE');
  });

  it('treats the Uber resend as a duplicate', () => {
    const parsed = parseEml(
      '10_uber_receipt_3_resend.eml',
      `Subject: Fwd: Your Wednesday trip with Uber\nFrom: Uber Receipts <noreply@uber.com>\n\nTotal INR 172.00\n`,
    );
    expect(classifyEmail(parsed).classification).toBe('DUPLICATE');
  });

  it('rejects a colleague forward', () => {
    const parsed = parseEml(
      '13_colleague_forward.eml',
      `Subject: Fwd: Your trip with Uber\nFrom: Deepa Nair <deepa.nair@nortexindustries.com>\n\nThanks for riding, Deepa\n`,
    );
    expect(classifyEmail(parsed).classification).toBe('OTHER_PERSON');
  });

  it('drops promo noise', () => {
    const parsed = parseEml(
      '14_promo_noise.eml',
      `Subject: FLAT 30% OFF on your next hotel booking\nFrom: MakeMyTrip Offers <offers@makemytrip.com>\n\nUnsubscribe.\n`,
    );
    expect(classifyEmail(parsed).classification).toBe('NOISE');
  });

  it('ignores a failed Uber charge', () => {
    const parsed = parseEml(
      '08_uber_payment_failed.eml',
      `Subject: Payment failed - your trip on 17 Jun\nFrom: Uber Receipts <noreply@uber.com>\n\nAmount due INR 172.00\n`,
    );
    expect(classifyEmail(parsed).classification).toBe('EXCLUDE');
  });
});
