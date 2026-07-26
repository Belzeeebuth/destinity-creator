import { LeaderboardView } from '@/components/leaderboard-view';
import { buildLeaderboard } from '@/lib/leaderboard';

export default function HomePage() {
  const rows = buildLeaderboard();

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Quel modèle pour quel budget ?
        </h1>
        <p className="mt-3 text-ink-secondary">
          Trois chiffres suffisent à trancher la plupart des choix : ce que le modèle sait
          faire, ce qu&apos;il coûte, et combien de contexte il encaisse. Le classement
          ci-dessous les met côte à côte, et le nuage montre la seule lecture honnête
          d&apos;un arbitrage qualité/prix — la frontière de Pareto.
        </p>
      </header>

      <LeaderboardView rows={rows} />
    </div>
  );
}
