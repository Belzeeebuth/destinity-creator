import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BenchmarkBars } from '@/components/benchmark-bars';
import { StatTile } from '@/components/stat-tile';
import { BENCHMARKS, getBenchmark } from '@/data/benchmarks';
import { MODELS } from '@/data/models';
import { SCORES_ARE_ILLUSTRATIVE } from '@/data/scores';
import { buildLeaderboard } from '@/lib/leaderboard';
import { formatDate, formatPrice, formatScore, formatTokens, hostname, NA } from '@/lib/format';

export function generateStaticParams() {
  return MODELS.map((model) => ({ slug: model.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const model = MODELS.find((m) => m.slug === slug);
  if (!model) return { title: 'Modèle introuvable' };
  return {
    title: model.name,
    description: `Tarifs, fenêtre de contexte, capacités et scores de benchmark pour ${model.name}.`,
  };
}

const CAPABILITY_LABELS: Record<string, string> = {
  vision: 'Vision',
  toolUse: 'Appel d’outils',
  thinking: 'Raisonnement étendu',
  openWeights: 'Poids ouverts',
};

export default async function ModelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = buildLeaderboard();
  const row = rows.find((r) => r.model.slug === slug);
  if (!row) notFound();

  const { model, provider } = row;

  return (
    <article className="space-y-8">
      <nav className="text-sm text-ink-muted">
        <Link href="/" className="underline underline-offset-2 hover:text-ink">
          Classement
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{model.name}</span>
      </nav>

      <header className="max-w-3xl">
        <p className="text-sm text-ink-secondary">{provider.name}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {model.name}
        </h1>
        {model.apiId ? (
          <p className="mt-3 text-sm text-ink-secondary">
            Identifiant d&apos;API :{' '}
            <code className="rounded bg-wash px-1.5 py-0.5 font-mono text-ink">
              {model.apiId}
            </code>
          </p>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">
            Identifiant d&apos;API non vérifié — à confirmer dans la documentation du
            fournisseur avant intégration.
          </p>
        )}
        {model.notes ? <p className="mt-3 text-ink-secondary">{model.notes}</p> : null}
      </header>

      <section aria-label="Chiffres clés" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Indice de qualité"
          value={formatScore(row.quality)}
          detail={row.quality !== null ? `rang ${row.rank} sur ${rows.length}` : undefined}
        />
        <StatTile
          label="Coût mixte / M tokens"
          value={formatPrice(row.blendedCost)}
          detail={row.onParetoFront ? 'Sur la frontière de Pareto' : undefined}
        />
        <StatTile label="Fenêtre de contexte" value={formatTokens(model.contextWindow)} />
        <StatTile label="Sortie maximale" value={formatTokens(model.maxOutput)} />
      </section>

      <section aria-label="Tarification" className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-hairline bg-surface p-4 sm:p-6">
          <h2 className="text-base font-semibold text-ink">Tarification</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-secondary">Entrée, par million de tokens</dt>
              <dd className="tnum font-semibold text-ink">
                {formatPrice(model.pricing.input)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-secondary">Sortie, par million de tokens</dt>
              <dd className="tnum font-semibold text-ink">
                {formatPrice(model.pricing.output)}
              </dd>
            </div>
            {model.pricing.cachedInput !== undefined ? (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-secondary">Entrée en cache</dt>
                <dd className="tnum font-semibold text-ink">
                  {formatPrice(model.pricing.cachedInput ?? null)}
                </dd>
              </div>
            ) : null}
          </dl>
          {model.pricing.note ? (
            <p className="mt-3 text-sm text-ink-muted">{model.pricing.note}</p>
          ) : null}
          <p className="mt-4 border-t border-hairline pt-3 text-sm text-ink-muted">
            Relevé le {formatDate(model.verifiedAt)}.{' '}
            {model.sources.map((source, index) => (
              <span key={source}>
                {index > 0 ? ', ' : ''}
                <a
                  href={source}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline underline-offset-2 hover:text-ink"
                >
                  {hostname(source)}
                </a>
              </span>
            ))}
          </p>
        </div>

        <div className="rounded-lg border border-hairline bg-surface p-4 sm:p-6">
          <h2 className="text-base font-semibold text-ink">Capacités</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(Object.keys(CAPABILITY_LABELS) as (keyof typeof model.capabilities)[]).map(
              (key) => {
                const on = model.capabilities[key];
                return (
                  <li key={key} className="flex items-center justify-between gap-4">
                    <span className="text-ink-secondary">{CAPABILITY_LABELS[key]}</span>
                    <span className={on ? 'text-good' : 'text-ink-muted'}>
                      <span aria-hidden="true">{on ? '✓' : '—'}</span>
                      <span className="sr-only">{on ? 'pris en charge' : 'non pris en charge'}</span>
                    </span>
                  </li>
                );
              },
            )}
            <li className="flex items-center justify-between gap-4 border-t border-hairline pt-2">
              <span className="text-ink-secondary">Date de sortie</span>
              <span className="text-ink">{formatDate(model.releasedAt)}</span>
            </li>
          </ul>
          {model.selfHosted ? (
            <p className="mt-4 text-sm text-ink-muted">
              Modèle auto-hébergé : son coût est de l&apos;infrastructure, pas du token. Il
              est donc exclu du nuage qualité/coût.
            </p>
          ) : null}
        </div>
      </section>

      <BenchmarkBars scores={row.scores} title={`Scores de ${model.name}`} />

      {/* Vue tableau : jumelle propre du graphique, lisible sans survol. */}
      <section aria-label="Scores détaillés">
        <h2 className="mb-3 text-base font-semibold text-ink">Détail des scores</h2>
        <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-hairline text-left">
                <th scope="col" className="px-3 py-2.5 font-medium text-ink-secondary">
                  Benchmark
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium text-ink-secondary">
                  Score
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium text-ink-secondary">
                  Provenance
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(row.scores).length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-ink-muted">
                    Aucun score disponible pour ce modèle.
                  </td>
                </tr>
              ) : null}
              {BENCHMARKS.map((benchmark) => row.scores[benchmark.id])
                .filter((score) => score !== undefined)
                .map((score) => (
                  <tr key={score.benchmarkId} className="border-b border-hairline last:border-0">
                    <td className="px-3 py-2.5 text-ink">
                      <Link
                        href={`/benchmarks#${score.benchmarkId}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {getBenchmark(score.benchmarkId)?.name ?? score.benchmarkId}
                      </Link>
                    </td>
                    <td className="tnum px-3 py-2.5 text-right font-semibold text-ink">
                      {formatScore(score.value)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-ink-muted">
                      {score.provenance === 'illustrative'
                        ? 'démonstration'
                        : score.provenance === 'measured'
                          ? 'mesuré'
                          : 'publié'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {SCORES_ARE_ILLUSTRATIVE ? (
          <p className="mt-3 text-sm text-ink-muted">
            Ces scores sont des valeurs de démonstration. Le coût, la fenêtre de contexte et
            les capacités ci-dessus sont, eux, relevés auprès du fournisseur —{' '}
            {formatDate(model.verifiedAt) === NA
              ? 'date de relevé inconnue'
              : `dernier relevé le ${formatDate(model.verifiedAt)}`}
            .
          </p>
        ) : null}
      </section>

      <p className="text-sm">
        <Link
          href={`/compare?models=${model.slug}`}
          className="underline underline-offset-2 hover:text-ink"
        >
          Comparer {model.name} à un autre modèle
        </Link>
      </p>
    </article>
  );
}
