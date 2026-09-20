import type { Claim } from '../types';
import { formatInr } from '../money';

function payableHint(claim: Claim): string {
  if (claim.status === 'PAID') return 'Paid to employee';
  if (claim.payablePaise < 0) return 'Recoverable from payroll';
  if (claim.status === 'READY_TO_PAY') return 'Queued for the 10th/25th run';
  return 'Not yet paid';
}

export function MoneyTiles({ claim }: { claim: Claim }) {
  const tiles = [
    { label: 'Claimed', value: claim.claimedPaise, hint: 'Including disallowed extras' },
    { label: 'Reimbursable', value: claim.reimbursablePaise, hint: 'After Nortex policy' },
    { label: 'Advance applied', value: claim.advanceAppliedPaise, hint: claim.travelRequest.advanceRef || 'None' },
    { label: 'Payable', value: claim.payablePaise, hint: payableHint(claim) },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="bg-white border border-line rounded-xl p-4">
          <div className="text-xs text-muted">{t.label}</div>
          <div className="text-xl font-semibold mt-1">{formatInr(t.value)}</div>
          <div className="text-xs text-muted mt-1">{t.hint}</div>
        </div>
      ))}
    </div>
  );
}
