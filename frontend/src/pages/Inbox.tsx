import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatDate } from '../money';
import type { InboxMessage } from '../types';

const TONE: Record<InboxMessage['classification'], string> = {
  INCLUDE: 'bg-green-50 text-green-800 border-green-100',
  EXCLUDE: 'bg-amber-50 text-amber-900 border-amber-100',
  DUPLICATE: 'bg-orange-50 text-orange-900 border-orange-100',
  NOISE: 'bg-slate-100 text-slate-700 border-slate-200',
  OTHER_PERSON: 'bg-red-50 text-red-800 border-red-100',
  CONTEXT: 'bg-sky-50 text-sky-900 border-sky-100',
};

export function InboxPage() {
  const [rows, setRows] = useState<InboxMessage[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<InboxMessage[]>('/api/inbox').then(setRows).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-700">{error}</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Trip inbox</h1>
        <p className="text-sm text-muted mt-1">
          15 messages from Chaitanya’s mailbox. Classification is deterministic — open a row and you can argue with the
          reason.
        </p>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="bg-white border border-line rounded-xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-medium">{row.subject}</div>
                <div className="text-xs text-muted mt-1">
                  {row.fromAddr} · {formatDate(row.receivedAt)} · {row.filename}
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full border ${TONE[row.classification]}`}>
                {row.classification.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm mt-3">{row.reason}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
