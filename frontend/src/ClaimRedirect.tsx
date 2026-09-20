import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from './api';
import type { Dashboard } from './types';

export function ClaimRedirect() {
  const [id, setId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Dashboard>('/api/dashboard')
      .then((d) => setId(d.primaryClaimId))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!id) return <p className="text-muted">Loading settlement…</p>;
  return <Navigate to={`/claims/${id}`} replace />;
}
