import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { User } from '../types';

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [people, setPeople] = useState<User[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<User[]>('/api/auth/directory')
      .then(setPeople)
      .catch(() => setError('API is not running. Start the backend on port 3000.'));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!email) {
      setError('Select the right employee from the directory');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await signup(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <section className="hidden lg:flex flex-col justify-center bg-[#ecf6ef] p-12">
        <h1 className="text-3xl font-semibold">Select the right person</h1>
        <p className="mt-3 text-muted max-w-md">
          Accounts are not invented. You must pick a row from <code>employee_master.csv</code>. Chaitanya raises the
          Bengaluru trip. Suresh is his manager. Meera is HoD. Ravi is Finance.
        </p>
      </section>
      <section className="p-8 lg:p-14 flex flex-col justify-center bg-white">
        <h2 className="text-2xl font-semibold">Create account</h2>
        <p className="text-sm text-muted mt-1">Choose yourself, then set a password.</p>
        {error && <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm">
            Nortex employee
            <select
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-line rounded-lg px-3 py-2 bg-white"
            >
              <option value="">Select the right employee…</option>
              {people.map((p) => (
                <option key={p.email} value={p.email}>
                  {p.name} · {p.empCode} · {p.role.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-line rounded-lg px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Confirm password
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full border border-line rounded-lg px-3 py-2"
            />
          </label>
          <button
            disabled={busy}
            className="w-full bg-brand text-white rounded-lg py-2.5 font-medium disabled:opacity-60"
          >
            Create account
          </button>
        </form>
        <p className="text-sm text-muted mt-6">
          Already have an account?{' '}
          <Link className="text-brand font-medium" to="/login">
            Sign in
          </Link>
        </p>
      </section>
    </div>
  );
}
