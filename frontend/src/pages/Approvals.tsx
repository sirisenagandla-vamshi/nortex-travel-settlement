import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { statusLabel } from '../components/Stepper';
import { formatInr } from '../money';
import type { Claim } from '../types';

export function ApprovalsPage() {
  const [rows, setRows] = useState<Claim[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Claim[]>('/api/approvals').then(setRows).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-700">{error}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Approvals waiting on you</h1>
      {rows.length === 0 && <p className="text-sm text-muted">Nothing in your queue. Switch to Chaitanya and submit first.</p>}
      {rows.map((c) => (
        <Link key={c.id} to={`/claims/${c.id}`} className="block bg-white border border-line rounded-xl p-4 hover:border-brand">
          <div className="flex justify-between gap-3">
            <div>
              <div className="font-medium">{c.claimNumber} · {c.claimant.name}</div>
              <div className="text-sm text-muted">{c.travelRequest.destination} · {statusLabel(c.status)}</div>
            </div>
            <div className="text-right">
              <div className="font-medium">{formatInr(c.reimbursablePaise)}</div>
              <div className="text-xs text-muted">policy-applied</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
