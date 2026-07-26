'use client';

const STORAGE_KEY = 'destinity-theme';

/**
 * L'icône affichée est décidée en CSS à partir de `data-theme` (voir
 * `globals.css`), pas par un état React : pas d'effet, pas de désaccord
 * d'hydratation, et le bon symbole dès le premier rendu.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const current =
      root.dataset.theme ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Stockage indisponible (navigation privée) : la bascule reste valable
      // pour la session en cours.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-md border border-hairline px-3 py-1.5 text-sm text-ink-secondary transition-colors hover:bg-wash hover:text-ink"
    >
      <span className="theme-icon-dark" aria-hidden="true">
        ☾
      </span>
      <span className="theme-icon-light" aria-hidden="true">
        ☀
      </span>
      <span className="sr-only">Changer de thème</span>
    </button>
  );
}
