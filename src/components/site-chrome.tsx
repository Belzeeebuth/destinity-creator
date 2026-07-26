import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import { SCORES_ARE_ILLUSTRATIVE } from '@/data/scores';

const NAV = [
  { href: '/', label: 'Classement' },
  { href: '/compare', label: 'Comparer' },
  { href: '/benchmarks', label: 'Benchmarks' },
  { href: '/methodologie', label: 'Méthodologie' },
];

export function SiteHeader() {
  return (
    <header className="border-b border-hairline bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
        <Link href="/" className="text-base font-semibold tracking-tight text-ink">
          Destinity<span className="text-ink-muted"> / bench</span>
        </Link>
        <nav className="order-last flex w-full flex-wrap items-center gap-x-5 gap-y-2 text-sm sm:order-none sm:w-auto sm:flex-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-ink-secondary transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-hairline bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-ink-secondary sm:px-6">
        <p>
          Comparateur de modèles de langage : qualité, coût, fenêtre de contexte. Les tarifs
          sont relevés manuellement et datés modèle par modèle — voir la{' '}
          <Link href="/methodologie" className="underline underline-offset-2 hover:text-ink">
            méthodologie
          </Link>
          .
        </p>
        <p className="mt-2 text-ink-muted">
          Aucune donnée n&apos;est collectée. Les prix évoluent : vérifiez auprès du
          fournisseur avant tout arbitrage budgétaire.
        </p>
      </div>
    </footer>
  );
}

/**
 * Bandeau affiché tant que les scores du dépôt sont des valeurs de
 * démonstration. Il disparaît dès que `SCORES_ARE_ILLUSTRATIVE` passe à `false`.
 */
export function IllustrativeBanner() {
  if (!SCORES_ARE_ILLUSTRATIVE) return null;
  return (
    <div className="border-b border-hairline bg-warning/15">
      <p className="mx-auto max-w-6xl px-4 py-3 text-sm text-ink sm:px-6">
        <span aria-hidden="true">⚠ </span>
        <strong className="font-semibold">Scores de démonstration.</strong>{' '}
        Les valeurs de benchmark de ce site ne proviennent d&apos;aucune mesure et ne reflètent la
        performance réelle d&apos;aucun modèle. Les tarifs, fenêtres de contexte et
        capacités, eux, sont relevés auprès des fournisseurs et datés.
      </p>
    </div>
  );
}
