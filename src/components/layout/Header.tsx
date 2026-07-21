import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/boutique', icon: '🛒', label: 'Boutique' },
  { to: '/badges', icon: '🏅', label: 'Badges' },
  { to: '/pantheon', icon: '🏛️', label: 'Panthéon' },
];

export default function Header() {
  const location = useLocation();
  return (
    <header className="sticky top-0 z-40 border-b border-pitch-600/40 bg-pitch-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold tracking-wide text-ink-100">
          <span className="grid h-8 w-8 place-items-center rounded-full border border-gold-500/60 bg-pitch-800 text-gold-400">
            ⚽
          </span>
          Destiny Eleven
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${
                  active ? 'bg-gold-500/15 text-gold-400' : 'text-ink-300 hover:bg-white/5 hover:text-ink-100'
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
