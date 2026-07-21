import { BADGES } from '../data/badges';
import { useGameStore } from '../state/store';

export default function BadgesPage() {
  const unlockedBadgeIds = useGameStore((s) => s.meta.unlockedBadgeIds);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl text-ink-100">🏅 Badges</h1>
      <p className="mt-1 text-sm text-ink-300">
        {unlockedBadgeIds.length}/{BADGES.length} débloqués, cumulés sur toutes tes carrières jouées sur cet appareil.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BADGES.map((badge) => {
          const unlocked = unlockedBadgeIds.includes(badge.id);
          return (
            <div
              key={badge.id}
              className={`card flex items-start gap-3 p-4 ${unlocked ? 'border-gold-500/50' : 'opacity-60'}`}
            >
              <span className="text-2xl">{unlocked ? '🏅' : '🔒'}</span>
              <div>
                <div className="font-display text-lg text-ink-100">{badge.name}</div>
                <p className="text-sm text-ink-300">{badge.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
