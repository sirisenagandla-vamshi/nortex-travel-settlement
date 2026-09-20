import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

function roleLabel(role: string) {
  return role.replaceAll('_', ' ').toLowerCase();
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const manager = ['REPORTING_MANAGER', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DIVISION', 'MD'].includes(user.role);
  const finance = user.role === 'FINANCE';

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <aside className="bg-white border-r border-line px-4 py-5 flex flex-col">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-brand text-white grid place-items-center font-semibold">N</div>
          <div>
            <div className="font-semibold leading-tight">Nortex</div>
            <div className="text-xs text-muted">Travel settlement</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          <NavItem to="/" label="Dashboard" />
          <NavItem to="/claims/new" label="New request" />
          <NavItem to="/inbox" label="Inbox" />
          <NavItem to="/claim" label="Claims" />
          {manager && <NavItem to="/approvals" label="Approvals" />}
          {finance && <NavItem to="/finance" label="Finance" />}
        </nav>
        <div className="mt-auto text-xs text-muted px-2">
          Seeded from the take-home pack. One trip, four roles.
        </div>
      </aside>
      <div className="min-w-0">
        <header className="h-14 bg-white border-b border-line flex items-center justify-between px-6">
          <div className="text-sm text-muted">Nortex Industries · Travel & expense</div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs text-muted capitalize">
                {user.empCode} · {roleLabel(user.role)}
              </div>
            </div>
            <button
              className="text-sm border border-line rounded-lg px-3 py-1.5 hover:bg-paper"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="p-6 max-w-6xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 ${isActive ? 'bg-green-50 text-brand font-medium' : 'text-ink hover:bg-paper'}`
      }
    >
      {label}
    </NavLink>
  );
}
