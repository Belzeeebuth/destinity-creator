import type { Metadata } from 'next';
import Link from 'next/link';
import { BENCHMARKS, CATEGORY_LABELS } from '@/data/benchmarks';
import { buildLeaderboard } from '@/lib/leaderboard';
import { formatScore, hostname } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Benchmarks',
  description:
    'Les suites d’évaluation suivies par le classement : ce qu’elles mesurent, leur poids dans l’indice composite, et le trio de tête de chacune.',
};

export default function BenchmarksPage() {
  const rows = buildLeaderboard();

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Les benchmarks suivis
        </h1>
        <p className="mt-3 text-ink-secondary">
          Un benchmark ne mesure jamais « l&apos;intelligence » : il mesure une tâche, dans
          un format, à une date. Voici ce que chacun teste réellement et le poids qu&apos;il
          porte dans l&apos;indice composite.
        </p>
      </header>

      <ul className="space-y-4">
        {BENCHMARKS.map((benchmark) => {
          const ranked = rows
            .map((row) => ({ row, score: row.scores[benchmark.id]?.value }))
            .filter((entry): entry is { row: (typeof rows)[number]; score: number } =>
              entry.score !== undefined,
            )
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

          return (
            <li
              key={benchmark.id}
              id={benchmark.id}
              className="scroll-mt-24 rounded-lg border border-hairline bg-surface p-4 sm:p-6"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-base font-semibold text-ink">{benchmark.name}</h2>
                <span className="rounded-full border border-hairline px-2 py-0.5 text-xs text-ink-secondary">
                  {CATEGORY_LABELS[benchmark.category]}
                </span>
                <span className="text-xs text-ink-muted">
                  poids {benchmark.weight.toFixed(1)} · {benchmark.unit}
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-ink-secondary">
                {benchmark.description}
              </p>

              {ranked.length > 0 ? (
                <ol className="mt-4 space-y-1.5 text-sm">
                  {ranked.map((entry, index) => (
                    <li key={entry.row.model.slug} className="flex items-baseline gap-3">
                      <span className="tnum w-4 text-ink-muted">{index + 1}</span>
                      <Link
                        href={`/modeles/${entry.row.model.slug}`}
                        className="flex-1 text-ink underline-offset-2 hover:underline"
                      >
                        {entry.row.model.name}
                      </Link>
                      <span className="tnum font-semibold text-ink">
                        {formatScore(entry.score)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-sm text-ink-muted">Aucun score disponible.</p>
              )}

              <p className="mt-4 text-sm">
                <a
                  href={benchmark.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-ink-muted underline underline-offset-2 hover:text-ink"
                >
                  {hostname(benchmark.url)}
                </a>
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
