import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { formatInr } from '../money';
import type { Dashboard } from '../types';

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Dashboard>('/api/dashboard').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!data || !user) return <p className="text-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Good to see you, {user.name.split(' ')[0]}</h1>
          <p className="text-muted text-sm mt-1">
            {user.designation} · {user.role.replaceAll('_', ' ').toLowerCase()}
          </p>
        </div>
        {user.role === 'EMPLOYEE' && (
          <Link to="/claims/new" className="bg-brand text-white rounded-lg px-4 py-2 text-sm">
            + New request
          </Link>
        )}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card label="Needs attention" value={String(data.needsAttention)} hint="Drafts or returned claims" />
        <Card label="In the chain" value={String(data.inProgress)} hint="Submitted, not paid" />
        <Card label="For you to approve" value={String(data.toApprove)} hint="Pending your step" />
        <Card label="Finance queue" value={String(data.toVerify)} hint="After business approvals" />
      </div>
      <div className="bg-white border border-line rounded-xl p-5">
        <h2 className="font-medium">This take-home, in one trip</h2>
        <p className="text-sm text-muted mt-2 max-w-2xl">
          Chaitanya Reddy travelled Pune → Bengaluru, 16–20 Jun 2026. The inbox was classified, the settlement was
          drafted against NTX-HR-POL-11, and ₹20,000 advance will be netted at payout. Open the settlement to walk it.
        </p>
        {data.primaryClaimId && (
          <Link
            to={`/claims/${data.primaryClaimId}`}
            className="inline-flex mt-4 bg-brand text-white rounded-lg px-4 py-2 text-sm"
          >
            Open settlement
          </Link>
        )}
        <p className="text-xs text-muted mt-3">Reimbursed so far in this seed: {formatInr(data.reimbursedPaise)}</p>
      </div>
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-white border border-line rounded-xl p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      <div className="text-xs text-muted mt-1">{hint}</div>
    </div>
  );
}
