import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { statusLabel } from '../components/Stepper';
import { formatInr } from '../money';
import type { Claim } from '../types';

export function FinancePage() {
  const [rows, setRows] = useState<Claim[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Claim[]>('/api/finance/queue').then(setRows).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-700">{error}</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Finance desk</h1>
        <p className="text-sm text-muted mt-1">
          Every claim needs finance verification after business approvals. Payment runs are the 10th and 25th.
        </p>
      </div>
      {rows.length === 0 && <p className="text-sm text-muted">Queue empty. Walk Employee → Manager → HoD first.</p>}
      {rows.map((c) => (
        <Link key={c.id} to={`/claims/${c.id}`} className="block bg-white border border-line rounded-xl p-4 hover:border-brand">
          <div className="flex justify-between gap-3">
            <div>
              <div className="font-medium">{c.claimNumber} · {c.claimant.name}</div>
              <div className="text-sm text-muted">
                {statusLabel(c.status)} · disallowed {formatInr(c.disallowedPaise)}
              </div>
            </div>
            <div className="text-right text-sm">
              <div>Reimbursable {formatInr(c.reimbursablePaise)}</div>
              <div className="font-medium">Net {formatInr(c.payablePaise)}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
