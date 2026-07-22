import { Link, useLocation } from 'react-router-dom';
import { useGameStore } from '../../state/store';

const NAV_ITEMS = [
  { to: '/boutique', icon: '🛒', label: 'Boutique' },
  { to: '/badges', icon: '🏅', label: 'Badges' },
  { to: '/pantheon', icon: '🏛️', label: 'Panthéon' },
];

export default function Header() {
  const location = useLocation();
  const career = useGameStore((s) => s.career);
  const navItems = career && !career.retired ? [{ to: '/patrimoine', icon: '💰', label: 'Patrimoine' }, ...NAV_ITEMS] : NAV_ITEMS;
  return (
    <header className="sticky top-0 z-40 border-b border-pitch-600/40 bg-pitch-950/85 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.8)] backdrop-blur-md">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5 font-display text-xl font-semibold tracking-wide text-ink-100">
          <span className="relative grid h-9 w-9 place-items-center rounded-full bg-gradient-to-b from-pitch-700 to-pitch-900 shadow-[0_0_0_1px_rgba(234,189,82,0.5),0_4px_12px_-4px_rgba(0,0,0,0.6)] transition-transform duration-200 group-hover:scale-105">
            <svg viewBox="0 0 64 64" className="h-5 w-5" aria-hidden>
              <circle cx="32" cy="32" r="14" fill="none" stroke="#eabd52" strokeWidth="3" />
              <polygon points="32,22 38,27 36,34 28,34 26,27" fill="#eabd52" />
              <path
                d="M32 8 L32 16 M32 48 L32 56 M8 32 L16 32 M48 32 L56 32"
                stroke="#eabd52"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>
            Destiny <span className="text-gradient-gold">Eleven</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${
                  active ? 'bg-gold-500/15 text-gold-400 shadow-[0_0_0_1px_rgba(234,189,82,0.35)]' : 'text-ink-300 hover:bg-white/5 hover:text-ink-100'
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
                {active && (
                  <span className="absolute -bottom-[13px] left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-gold-500 shadow-[0_0_8px_rgba(234,189,82,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
