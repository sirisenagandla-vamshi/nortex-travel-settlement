import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <section className="hidden lg:flex flex-col justify-between bg-[#ecf6ef] p-12">
        <div className="font-semibold text-brand">Nortex</div>
        <div>
          <h1 className="text-4xl font-semibold leading-tight text-ink">Reimbursements that explain themselves.</h1>
          <p className="mt-4 text-muted max-w-md">
            One place to raise a claim, see the policy that governs it, and follow it all the way through to payment.
          </p>
          <ul className="mt-8 space-y-4 text-sm text-ink">
            <li>
              <strong>Requests that shape themselves.</strong> Pick the category — Domestic travel — and the form,
              policy and approval chain come with it.
            </li>
            <li>
              <strong>Assistance, not autopilot.</strong> The pack inbox is classified; you still confirm the right
              lines.
            </li>
            <li>
              <strong>Every step on the record.</strong> Manager, HoD and Finance each act with a reason kept.
            </li>
          </ul>
        </div>
        <div className="text-xs text-muted">Nortex Industries · travel & expense</div>
      </section>
      <section className="p-8 lg:p-14 flex flex-col justify-center bg-white">
        <h2 className="text-2xl font-semibold">Sign in</h2>
        <p className="text-sm text-muted mt-1">Use your work email from employee_master.csv</p>
        {error && <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm">
            Work email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-line rounded-lg px-3 py-2"
              placeholder="chaitanya.reddy@nortexindustries.com"
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-line rounded-lg px-3 py-2"
            />
          </label>
          <button
            disabled={busy}
            className="w-full bg-brand text-white rounded-lg py-2.5 font-medium disabled:opacity-60"
          >
            Sign in
          </button>
        </form>
        <p className="text-sm text-muted mt-6">
          New here?{' '}
          <Link className="text-brand font-medium" to="/signup">
            Create an account
          </Link>
          — select yourself from the Nortex directory.
        </p>
        <p className="text-xs text-muted mt-4">
          Seeded password is your employee code until you sign up and set a new one. Example: Chaitanya Reddy /
          NX-4471
        </p>
      </section>
    </div>
  );
}
