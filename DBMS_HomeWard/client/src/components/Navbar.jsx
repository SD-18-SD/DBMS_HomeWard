import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
    isActive ? 'bg-ink text-paper' : 'text-ink hover:bg-sage'
  }`;

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await logout();
    toast.success('You are logged out');
    setOpen(false);
    navigate('/');
  }

  const links = (
    <>
      <NavLink to="/pets" className={linkClass} onClick={() => setOpen(false)}>
        Find a pet
      </NavLink>
      <NavLink to="/campaigns" end className={linkClass} onClick={() => setOpen(false)}>
        Fundraisers
      </NavLink>
      <NavLink to="/listings/new" className={linkClass} onClick={() => setOpen(false)}>
        List a pet
      </NavLink>
      {user && (
        <NavLink to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>
          My dashboard
        </NavLink>
      )}
      {isAdmin && (
        <NavLink to="/admin" className={linkClass} onClick={() => setOpen(false)}>
          Admin
        </NavLink>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b-2 border-line bg-cream">
      <nav className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <div className="hidden items-center gap-1 lg:flex">{links}</div>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <NavLink to="/profile" className={linkClass}>
                {user.name.split(' ')[0]}
              </NavLink>
              <button onClick={handleLogout} className="btn-outline py-2">
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}>
                Log in
              </NavLink>
              <NavLink to="/register" className="btn-primary py-2">
                Create account
              </NavLink>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="btn-ghost lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="container-page flex flex-col gap-1 border-t-2 border-line pb-4 pt-3 lg:hidden">
          {links}
          {user ? (
            <>
              <NavLink to="/profile" className={linkClass} onClick={() => setOpen(false)}>
                Profile
              </NavLink>
              <button onClick={handleLogout} className="btn-outline mt-2">
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClass} onClick={() => setOpen(false)}>
                Log in
              </NavLink>
              <NavLink to="/register" className="btn-primary mt-2" onClick={() => setOpen(false)}>
                Create account
              </NavLink>
            </>
          )}
        </div>
      )}
    </header>
  );
}
