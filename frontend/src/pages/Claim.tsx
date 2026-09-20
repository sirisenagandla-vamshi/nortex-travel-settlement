import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { MoneyTiles } from '../components/MoneyTiles';
import { Stepper, statusLabel } from '../components/Stepper';
import { formatDate, formatInr } from '../money';
import type { Claim } from '../types';

export function ClaimPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  async function reload() {
    if (!id) return;
    const data = await api<Claim>(`/api/claims/${id}`);
    setClaim(data);
  }

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!claim || !user) return <p className="text-muted">Loading…</p>;

  const isClaimant = user.id === claim.claimant.id;
  const pending = claim.approvals.find((a) => a.action === 'PENDING');
  const canDecide = pending?.assignee.id === user.id;
  const canFinance = user.role === 'FINANCE' && (claim.status === 'PENDING_FINANCE' || claim.status === 'READY_TO_PAY');
  const editable = isClaimant && (claim.status === 'DRAFT' || claim.status === 'RETURNED');

  async function run(fn: () => Promise<Claim>) {
    setBusy(true);
    setError('');
    try {
      setClaim(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted">{claim.travelRequest.travelRequestId}</div>
          <h1 className="text-2xl font-semibold">{claim.claimNumber}</h1>
          <p className="text-sm text-muted mt-1">
            {claim.claimant.name} · {claim.travelRequest.destination} · {formatDate(claim.travelRequest.startDate)} –{' '}
            {formatDate(claim.travelRequest.endDate)}
          </p>
        </div>
        <span className="text-sm bg-green-50 text-brand border border-green-100 rounded-full px-3 py-1">
          {statusLabel(claim.status)}
        </span>
      </div>

      <div className="bg-white border border-line rounded-xl p-5">
        <Stepper status={claim.status} />
        <p className="text-xs text-muted mt-4">
          {claim.status === 'PAID'
            ? `This claim is closed. Finance paid ${formatInr(claim.payablePaise)} after netting advance ${claim.travelRequest.advanceRef ?? ''}.`
            : `Trip is approved and advance ${claim.travelRequest.advanceRef ?? ''} is applied. File or review the settlement lines against the pack inbox.`}
        </p>
      </div>

      <MoneyTiles claim={claim} />

      {claim.status === 'RETURNED' && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm">
          Returned for correction. Fix the lines and resubmit against the same Travel Request ID.
        </div>
      )}

      <section className="bg-white border border-line rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-line flex justify-between">
          <h2 className="font-medium">Settlement lines</h2>
          <span className="text-xs text-muted">Disallowed amounts stay visible</span>
        </header>
        <div className="divide-y divide-line">
          {claim.lines.map((line) => (
            <label key={line.id} className="flex gap-4 p-4 items-start">
              <input
                type="checkbox"
                className="mt-1"
                checked={line.included}
                disabled={!editable || busy}
                onChange={(e) =>
                  run(() =>
                    api<Claim>(`/api/claims/${claim.id}/lines/${line.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ included: e.target.checked }),
                    }),
                  )
                }
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      {line.merchant} · {line.description}
                    </div>
                    <div className="text-xs text-muted mt-1">
                      {line.category.replaceAll('_', ' ')} · {formatDate(line.incurredOn)}
                      {line.proofRef ? ` · ${line.proofRef}` : ''}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>Claimed {formatInr(line.claimedPaise)}</div>
                    <div className="text-brand">Allowed {formatInr(line.reimbursablePaise)}</div>
                    {line.disallowedPaise > 0 && (
                      <div className="text-red-700">Disallowed {formatInr(line.disallowedPaise)}</div>
                    )}
                  </div>
                </div>
                <ul className="mt-2 space-y-1">
                  {line.flags.map((flag) => (
                    <li key={flag} className="text-xs text-muted">
                      {flag}
                    </li>
                  ))}
                </ul>
                {line.proofRef?.endsWith('.png') && (
                  <a className="text-xs text-brand mt-2 inline-block" href={`/receipts/${line.proofRef}`} target="_blank" rel="noreferrer">
                    Open receipt
                  </a>
                )}
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-line rounded-xl p-4">
          <h2 className="font-medium mb-3">Approval chain</h2>
          {claim.approvals.length === 0 && (
            <p className="text-sm text-muted">Created on submit. Amount is above ₹25,000 so RM then HoD, then Finance.</p>
          )}
          <ol className="space-y-2">
            {claim.approvals.map((step) => (
              <li key={step.id} className="text-sm flex justify-between gap-2">
                <span>
                  {step.stepOrder}. {step.assignee.name} · {step.role.replaceAll('_', ' ').toLowerCase()}
                  {step.remarks ? ` — ${step.remarks}` : ''}
                </span>
                <span className="text-muted">{step.action.toLowerCase()}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="bg-white border border-line rounded-xl p-4 space-y-3">
          <h2 className="font-medium">Actions</h2>
          {editable && (
            <>
              <textarea
                className="w-full border border-line rounded-lg p-2 text-sm"
                rows={3}
                placeholder="Notes for finance"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button
                disabled={busy}
                className="bg-brand text-white rounded-lg px-4 py-2 text-sm disabled:opacity-60"
                onClick={() =>
                  run(() =>
                    api<Claim>(`/api/claims/${claim.id}/submit`, {
                      method: 'POST',
                      body: JSON.stringify({ notes }),
                    }),
                  )
                }
              >
                Submit settlement
              </button>
            </>
          )}
          {canDecide && (
            <>
              <textarea
                className="w-full border border-line rounded-lg p-2 text-sm"
                rows={2}
                placeholder="Remarks required to return or reject"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={busy}
                  className="bg-brand text-white rounded-lg px-4 py-2 text-sm"
                  onClick={() =>
                    run(() =>
                      api<Claim>(`/api/claims/${claim.id}/decide`, {
                        method: 'POST',
                        body: JSON.stringify({ action: 'APPROVED' }),
                      }),
                    )
                  }
                >
                  Approve this step
                </button>
                <button
                  disabled={busy}
                  className="border border-line rounded-lg px-4 py-2 text-sm"
                  onClick={() =>
                    run(() =>
                      api<Claim>(`/api/claims/${claim.id}/decide`, {
                        method: 'POST',
                        body: JSON.stringify({ action: 'RETURNED', remarks }),
                      }),
                    )
                  }
                >
                  Return
                </button>
                <button
                  disabled={busy}
                  className="text-red-700 border border-red-100 rounded-lg px-4 py-2 text-sm"
                  onClick={() =>
                    run(() =>
                      api<Claim>(`/api/claims/${claim.id}/decide`, {
                        method: 'POST',
                        body: JSON.stringify({ action: 'REJECTED', remarks }),
                      }),
                    )
                  }
                >
                  Reject
                </button>
              </div>
            </>
          )}
          {canFinance && claim.status === 'PENDING_FINANCE' && (
            <button
              disabled={busy}
              className="bg-brand text-white rounded-lg px-4 py-2 text-sm"
              onClick={() =>
                run(() =>
                  api<Claim>(`/api/claims/${claim.id}/finance/verify`, {
                    method: 'POST',
                    body: JSON.stringify({ notes: 'Folio extras disallowed. Advance netted.' }),
                  }),
                )
              }
            >
              Verify for payment run
            </button>
          )}
          {canFinance && claim.status === 'READY_TO_PAY' && (
            <button
              disabled={busy}
              className="bg-brand text-white rounded-lg px-4 py-2 text-sm"
              onClick={() => run(() => api<Claim>(`/api/claims/${claim.id}/finance/pay`, { method: 'POST' }))}
            >
              Mark paid
            </button>
          )}
          {!editable && !canDecide && !canFinance && (
            <p className="text-sm text-muted">No action on this step for {user.name.split(' ')[0]}.</p>
          )}
          <Link to="/inbox" className="text-sm text-brand inline-block">
            Review classified inbox
          </Link>
        </div>
      </section>
    </div>
  );
}
