import { InboxClassification } from './types';

export type ParsedEmail = {
  filename: string;
  fromAddr: string;
  subject: string;
  date: string;
  body: string;
};

export type ClassifiedEmail = ParsedEmail & {
  classification: InboxClassification;
  reason: string;
};

function header(raw: string, name: string): string {
  const match = raw.match(new RegExp(`^${name}:\\s*(.+)$`, 'im'));
  return match ? match[1].trim() : '';
}

export function parseEml(filename: string, raw: string): ParsedEmail {
  const bodySplit = raw.split(/\r?\n\r?\n/);
  const body = bodySplit.slice(1).join('\n\n').replace(/\r/g, '').trim();
  return {
    filename,
    fromAddr: header(raw, 'From'),
    subject: header(raw, 'Subject'),
    date: header(raw, 'Date'),
    body,
  };
}

/**
 * Deterministic rules over the 15-message inbox. No LLM.
 * Each branch is something a reviewer can read and argue with.
 */
export function classifyEmail(email: ParsedEmail): ClassifiedEmail {
  const subject = email.subject.toLowerCase();
  const body = email.body.toLowerCase();
  const fromAddr = email.fromAddr.toLowerCase();

  if (fromAddr.includes('offers@') || subject.includes('flat 30% off') || body.includes('unsubscribe')) {
    return {
      ...email,
      classification: 'NOISE',
      reason: 'Promotional mail. It is not a bill and must not appear on the settlement.',
    };
  }

  if (subject.includes('payment failed')) {
    return {
      ...email,
      classification: 'EXCLUDE',
      reason: 'Payment failed — this is not a paid receipt. The later successful charge for the same trip is the proof.',
    };
  }

  if (fromAddr.includes('deepa.nair') || body.includes('thanks for riding, deepa')) {
    return {
      ...email,
      classification: 'OTHER_PERSON',
      reason: 'Expense incurred by Deepa Nair. Policy §4: expenses of any person other than the claimant are never reimbursed.',
    };
  }

  if (email.filename.includes('resend') || subject.startsWith('fwd: your wednesday trip')) {
    return {
      ...email,
      classification: 'DUPLICATE',
      reason: 'Same Uber trip as 17 Jun 19:35 (₹172). Finance reconciles by date, amount and merchant — keep one proof.',
    };
  }

  if (
    subject.toLowerCase().includes('e-ticket') &&
    (body.includes('corporate card') || body.includes('nortex industries ltd'))
  ) {
    return {
      ...email,
      classification: 'EXCLUDE',
      reason: 'Air tickets were billed to the company card. Policy §3.2: employees do not claim centrally booked flights.',
    };
  }

  if (subject.toLowerCase().includes('hotel booking voucher')) {
    return {
      ...email,
      classification: 'CONTEXT',
      reason: 'Booking voucher. The tax invoice, not this voucher, is the claimable proof. Nights here (3) differ from the travel request (4).',
    };
  }

  if (subject.toLowerCase().includes('travel approval') || subject.toLowerCase().includes('travel advance')) {
    return {
      ...email,
      classification: 'CONTEXT',
      reason: 'Travel request / advance trail. Used to stamp the Travel Request ID and the ₹20,000 advance, not as a claim line.',
    };
  }

  if (fromAddr.includes('uber') && body.includes('total')) {
    return {
      ...email,
      classification: 'INCLUDE',
      reason: 'Personal-card cab receipt. Airport transfers and local conveyance are reimbursable on actuals against a receipt.',
    };
  }

  if (subject.toLowerCase().includes('dinner bill') || body.includes('vertex procurement')) {
    return {
      ...email,
      classification: 'INCLUDE',
      reason: 'Customer dinner. Claimed as Business Entertainment, not meal allowance. Needs attendee names.',
    };
  }

  if (subject.toLowerCase().includes('tax invoice') || body.includes('folio no')) {
    return {
      ...email,
      classification: 'INCLUDE',
      reason: 'Hotel tax invoice. Split into lodging, meals, and non-reimbursable extras (laundry, mini bar).',
    };
  }

  return {
    ...email,
    classification: 'CONTEXT',
    reason: 'Kept on the trip file for audit, not turned into a claim line.',
  };
}
