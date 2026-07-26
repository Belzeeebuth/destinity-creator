import type { Metadata } from 'next';
import { CompareView } from '@/components/compare-view';
import { buildLeaderboard } from '@/lib/leaderboard';

export const metadata: Metadata = {
  title: 'Comparer',
  description:
    'Comparez jusqu’à trois modèles côte à côte : scores par benchmark, tarifs, fenêtre de contexte et capacités.',
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ models?: string | string[] }>;
}) {
  const rows = buildLeaderboard();
  const params = await searchParams;

  const requested = Array.isArray(params.models)
    ? params.models
    : params.models
      ? params.models.split(',')
      : [];
  const known = new Set(rows.map((r) => r.model.slug));
  const initialSelection = requested.map((s) => s.trim()).filter((s) => known.has(s));

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Comparer des modèles
        </h1>
        <p className="mt-3 text-ink-secondary">
          Mettez jusqu&apos;à trois modèles côte à côte. Le graphique donne la forme, le
          tableau donne les chiffres — les deux disent la même chose, à des vitesses de
          lecture différentes.
        </p>
      </header>

      <CompareView rows={rows} initialSelection={initialSelection} />
    </div>
  );
}
