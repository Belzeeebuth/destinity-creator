import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORY_LABELS, INTERNAL_BENCHMARKS, PUBLIC_BENCHMARKS } from '@/data/benchmarks';
import type { Benchmark } from '@/data/types';
import { buildLeaderboard } from '@/lib/leaderboard';
import { formatScore, hostname } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Benchmarks',
  description:
    'Les suites que nous exécutons nous-mêmes, et les benchmarks publics listés pour référence.',
};

type Rows = ReturnType<typeof buildLeaderboard>;

function BenchmarkCard({ benchmark, rows }: { benchmark: Benchmark; rows: Rows }) {
  const ranked = rows
    .map((row) => ({ row, score: row.scores[benchmark.id]?.value }))
    .filter((entry): entry is { row: Rows[number]; score: number } => entry.score !== undefined)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <li
      id={benchmark.id}
      className="scroll-mt-24 rounded-lg border border-hairline bg-surface p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-base font-semibold text-ink">{benchmark.name}</h3>
        <span className="rounded-full border border-hairline px-2 py-0.5 text-xs text-ink-secondary">
          {CATEGORY_LABELS[benchmark.category]}
        </span>
        <span className="text-xs text-ink-muted">
          poids {formatScore(benchmark.weight)} · {benchmark.unit}
        </span>
      </div>
      <p className="mt-2 max-w-3xl text-sm text-ink-secondary">{benchmark.description}</p>

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
              <span className="tnum font-semibold text-ink">{formatScore(entry.score)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-ink-muted">
          Aucun score renseigné — nous n&apos;exécutons pas ce benchmark.
        </p>
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
}

export default function BenchmarksPage() {
  const rows = buildLeaderboard();

  return (
    <div className="space-y-12">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Les benchmarks
        </h1>
        <p className="mt-3 text-ink-secondary">
          Un benchmark ne mesure jamais « l&apos;intelligence » : il mesure une tâche, dans
          un format, à une date. La distinction qui compte ici est celle entre ce que nous
          exécutons nous-mêmes et ce que nous nous contentons de citer.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-ink">Suites internes — exécutées par nous</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-secondary">
          Écrites dans <code className="rounded bg-wash px-1.5 py-0.5 font-mono text-ink">bench/suites/</code>,
          lancées par notre harness, avec la trace de chaque appel conservée run par run.
          Notation déterministe : réponse exacte, JSON comparé en profondeur, séquence
          d&apos;appels d&apos;outils, ou tests exécutés en conteneur isolé. Aucun juge LLM
          dans le chemin par défaut, donc aucun biais de juge à corriger.
        </p>
        <ul className="mt-4 space-y-4">
          {INTERNAL_BENCHMARKS.map((benchmark) => (
            <BenchmarkCard key={benchmark.id} benchmark={benchmark} rows={rows} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">Benchmarks publics — pour référence</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-secondary">
          Nous ne les exécutons pas : leurs scores ne peuvent venir que d&apos;une
          publication citée, jamais de nous. Tant qu&apos;aucun chiffre sourcé n&apos;y est
          renseigné, ils restent volontairement vides plutôt que remplis d&apos;approximations.
          Ils sont listés parce qu&apos;ils cadrent le vocabulaire du domaine — et parce que
          leurs limites (contamination en tête) valent d&apos;être rappelées.
        </p>
        <ul className="mt-4 space-y-4">
          {PUBLIC_BENCHMARKS.map((benchmark) => (
            <BenchmarkCard key={benchmark.id} benchmark={benchmark} rows={rows} />
          ))}
        </ul>
      </section>
    </div>
  );
}
