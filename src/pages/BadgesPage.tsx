import { BADGES } from '../data/badges';
import { useGameStore } from '../state/store';
import { L } from '../i18n/language';
import { ui } from '../i18n/ui';

export default function BadgesPage() {
  const unlockedBadgeIds = useGameStore((s) => s.meta.unlockedBadgeIds);
  const language = useGameStore((s) => s.language);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl text-ink-100">{ui(language, 'badgesTitle')}</h1>
      <p className="mt-1 text-sm text-ink-300">
        {unlockedBadgeIds.length}/{BADGES.length} {ui(language, 'badgesUnlockedOf')}
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
                <div className="font-display text-lg text-ink-100">{L(language, badge.name, badge.nameEn)}</div>
                <p className="text-sm text-ink-300">{L(language, badge.description, badge.descriptionEn)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
