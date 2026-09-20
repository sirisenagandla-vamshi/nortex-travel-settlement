import type { ClaimStatus } from '../types';

const STEPS = [
  { key: 'request', label: 'Travel request', doneWhen: () => true },
  { key: 'trip', label: 'Trip approval', doneWhen: () => true },
  { key: 'advance', label: 'Advance', doneWhen: () => true },
  {
    key: 'settlement',
    label: 'Trip settlement',
    doneWhen: (s: ClaimStatus) => !['DRAFT', 'RETURNED'].includes(s),
    currentWhen: (s: ClaimStatus) => s === 'DRAFT' || s === 'RETURNED',
  },
  {
    key: 'approvals',
    label: 'Business approval',
    doneWhen: (s: ClaimStatus) =>
      ['PENDING_FINANCE', 'READY_TO_PAY', 'PAID'].includes(s),
    currentWhen: (s: ClaimStatus) => s === 'PENDING_RM' || s === 'PENDING_HOD',
  },
  {
    key: 'finance',
    label: 'Finance review',
    doneWhen: (s: ClaimStatus) => s === 'READY_TO_PAY' || s === 'PAID',
    currentWhen: (s: ClaimStatus) => s === 'PENDING_FINANCE',
  },
  {
    key: 'payout',
    label: 'Payout',
    doneWhen: (s: ClaimStatus) => s === 'PAID',
    currentWhen: (s: ClaimStatus) => s === 'READY_TO_PAY',
  },
];

export function Stepper({ status }: { status: ClaimStatus }) {
  return (
    <ol className="grid grid-cols-7 gap-2 text-center text-xs">
      {STEPS.map((step) => {
        const done = step.doneWhen(status);
        const current = step.currentWhen?.(status);
        return (
          <li key={step.key} className="flex flex-col items-center gap-2">
            <span
              className={`h-8 w-8 rounded-full grid place-items-center text-sm font-medium ${
                current
                  ? 'bg-brand text-white'
                  : done
                    ? 'bg-green-100 text-brand'
                    : 'bg-paper text-muted'
              }`}
            >
              {done && !current ? '✓' : ''}
            </span>
            <span className={current ? 'text-brand font-medium' : 'text-muted'}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function statusLabel(status: ClaimStatus): string {
  const map: Record<ClaimStatus, string> = {
    DRAFT: 'Settlement to be filed',
    SUBMITTED: 'Submitted',
    PENDING_RM: 'Waiting on reporting manager',
    PENDING_HOD: 'Waiting on Head of Department',
    PENDING_FINANCE: 'Finance review',
    RETURNED: 'Returned for correction',
    REJECTED: 'Rejected',
    READY_TO_PAY: 'Ready for 10th/25th run',
    PAID: 'Paid',
  };
  return map[status];
}
