import { rupeesToPaise } from './money';
import { applyPolicy, totals, netPayable } from './policy.engine';
import { PolicyLine, TripContext } from './types';

/**
 * Hotel folio KPW/26-27/1188 transcribed from receipts/hotel_invoice_1188.png.
 * GST of ₹2,304 on a ₹19,200 subtotal is prorated so laundry/minibar GST is also disallowed.
 */
export function hotelFolioLines(): PolicyLine[] {
  const room = rupeesToPaise(17250);
  const laundry = rupeesToPaise(450);
  const minibar = rupeesToPaise(380);
  const dining = rupeesToPaise(1120);
  const gst = rupeesToPaise(2304);
  const subtotal = room + laundry + minibar + dining;
  const gstShare = (part: number) => Math.round((part / subtotal) * gst);

  const roomGst = gstShare(room);
  const laundryGst = gstShare(laundry);
  const minibarGst = gstShare(minibar);
  const diningGst = gstShare(dining);

  return [
    {
      category: 'LODGING',
      merchant: 'Keys Prime Whitefield',
      description: 'Superior King, 3 nights @ ₹5,750 + GST on room tariff',
      incurredOn: '2026-06-16',
      claimedPaise: room + roomGst,
      reimbursablePaise: room + roomGst,
      disallowedPaise: 0,
      proofRef: 'hotel_invoice_1188.png',
      included: true,
      flags: ['Taxes on room tariff are reimbursable in full (policy §3.1).'],
      sourceFilename: '12_hotel_invoice.eml',
    },
    {
      category: 'OTHER',
      merchant: 'Keys Prime Whitefield',
      description: 'Laundry + GST share',
      incurredOn: '2026-06-17',
      claimedPaise: laundry + laundryGst,
      reimbursablePaise: 0,
      disallowedPaise: laundry + laundryGst,
      proofRef: 'hotel_invoice_1188.png',
      included: true,
      flags: ['Laundry is non-reimbursable (policy §4). Shown as disallowed, not omitted.'],
      sourceFilename: '12_hotel_invoice.eml',
    },
    {
      category: 'OTHER',
      merchant: 'Keys Prime Whitefield',
      description: 'Mini bar + GST share',
      incurredOn: '2026-06-18',
      claimedPaise: minibar + minibarGst,
      reimbursablePaise: 0,
      disallowedPaise: minibar + minibarGst,
      proofRef: 'hotel_invoice_1188.png',
      included: true,
      flags: ['Mini bar is non-reimbursable (policy §4). Shown as disallowed, not omitted.'],
      sourceFilename: '12_hotel_invoice.eml',
    },
    {
      category: 'MEALS',
      merchant: 'Keys Prime Whitefield',
      description: 'In-room dining + GST share',
      incurredOn: '2026-06-18',
      claimedPaise: dining + diningGst,
      reimbursablePaise: dining + diningGst,
      disallowedPaise: 0,
      proofRef: 'hotel_invoice_1188.png',
      included: true,
      flags: ['In-room dining is a meal, not lodging.'],
      sourceFilename: '12_hotel_invoice.eml',
    },
  ];
}

export function cabLines(): PolicyLine[] {
  return [
    {
      category: 'LOCAL_CONVEYANCE',
      merchant: 'Uber',
      description: 'Baner → Pune Airport (PNQ)',
      incurredOn: '2026-06-16',
      claimedPaise: rupeesToPaise(1415.02),
      reimbursablePaise: rupeesToPaise(1415.02),
      disallowedPaise: 0,
      proofRef: '06_uber_receipt_1.eml',
      included: true,
      flags: ['Airport transfer at origin. Paid on personal card.'],
      sourceFilename: '06_uber_receipt_1.eml',
    },
    {
      category: 'LOCAL_CONVEYANCE',
      merchant: 'Uber',
      description: 'BLR Airport → Keys Prime Whitefield',
      incurredOn: '2026-06-16',
      claimedPaise: rupeesToPaise(743),
      reimbursablePaise: rupeesToPaise(743),
      disallowedPaise: 0,
      proofRef: '07_uber_receipt_2.eml',
      included: true,
      flags: ['Airport transfer at destination.'],
      sourceFilename: '07_uber_receipt_2.eml',
    },
    {
      category: 'LOCAL_CONVEYANCE',
      merchant: 'Uber',
      description: 'Vertex Technologies → Keys Prime Whitefield',
      incurredOn: '2026-06-17',
      claimedPaise: rupeesToPaise(172),
      reimbursablePaise: rupeesToPaise(172),
      disallowedPaise: 0,
      proofRef: '09_uber_receipt_3.eml',
      included: true,
      flags: ['One trip. Failed-payment mail and the next-day resend were dropped as duplicate/noise.'],
      sourceFilename: '09_uber_receipt_3.eml',
    },
    {
      category: 'LOCAL_CONVEYANCE',
      merchant: 'Uber',
      description: 'Pune Airport → Baner',
      incurredOn: '2026-06-20',
      claimedPaise: rupeesToPaise(1229.02),
      reimbursablePaise: rupeesToPaise(1229.02),
      disallowedPaise: 0,
      proofRef: '15_return_cab.eml',
      included: true,
      flags: ['Airport transfer on return.'],
      sourceFilename: '15_return_cab.eml',
    },
  ];
}

export function entertainmentLine(): PolicyLine {
  return {
    category: 'BUSINESS_ENTERTAINMENT',
    merchant: 'Spice Terrace, Whitefield',
    description: 'Dinner with Vertex procurement team — 4 covers. Bill 4471.',
    incurredOn: '2026-06-18',
    claimedPaise: rupeesToPaise(2255),
    reimbursablePaise: rupeesToPaise(2255),
    disallowedPaise: 0,
    proofRef: 'dinner_bill_18jun.png',
    included: true,
    flags: ['Attendees: Vertex procurement team (4 people).'],
    sourceFilename: '11_dinner_bill.eml',
  };
}

export const CHAITANYA_TRIP: TripContext = {
  destination: 'Bengaluru',
  cityClass: 'TIER_1',
  startDate: '2026-06-16',
  endDate: '2026-06-20',
  nightsRequested: 4,
  nightsBooked: 3,
  estimatedPaise: rupeesToPaise(48000),
  advanceDisbursedPaise: rupeesToPaise(20000),
  claimantName: 'Chaitanya Reddy',
};

export function buildChaitanyaSettlement() {
  const drafted = [...cabLines(), ...hotelFolioLines(), entertainmentLine()];
  const lines = applyPolicy(drafted, CHAITANYA_TRIP);
  const money = totals(lines);
  const payablePaise = netPayable(money.reimbursablePaise, CHAITANYA_TRIP.advanceDisbursedPaise);
  return {
    lines,
    ...money,
    advanceAppliedPaise: CHAITANYA_TRIP.advanceDisbursedPaise,
    payablePaise,
  };
}
