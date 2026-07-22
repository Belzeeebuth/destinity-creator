import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../state/store';
import { getDailyChallengeConfig, decodeShareCode } from '../engine/challenges';
import { isDailyChallengeDoneToday } from '../engine/meta';
import { getCountry } from '../data/countries';
import { getPosition } from '../data/positions';
import { L } from '../i18n/language';
import { ui } from '../i18n/ui';
import CountryFlag from '../components/ui/CountryFlag';

export default function ChallengesPage() {
  const navigate = useNavigate();
  const startCareer = useGameStore((s) => s.startCareer);
  const career = useGameStore((s) => s.career);
  const meta = useGameStore((s) => s.meta);
  const language = useGameStore((s) => s.language);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const dailyConfig = getDailyChallengeConfig(new Date());
  const dailyCountry = getCountry(dailyConfig.countryCode);
  const dailyPosition = getPosition(dailyConfig.positionCode);
  const doneToday = isDailyChallengeDoneToday(meta);

  function guardActiveCareer(): boolean {
    if (career && !career.retired) {
      return confirm(ui(language, 'challengeConfirmReplace'));
    }
    return true;
  }

  function playDaily() {
    if (!guardActiveCareer()) return;
    startCareer(dailyConfig);
    navigate('/carriere');
  }

  function playFriendCode() {
    const decoded = decodeShareCode(code);
    if (!decoded) {
      setCodeError(ui(language, 'invalidCode'));
      return;
    }
    if (!guardActiveCareer()) return;
    startCareer({ ...decoded, mode: 'friend' });
    navigate('/carriere');
  }

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-8">
      <section>
        <h1 className="font-display text-3xl text-ink-100">{ui(language, 'dailyChallengeTitle')}</h1>
        <p className="mt-1 text-sm text-ink-300">{ui(language, 'dailyChallengeSubtitle')}</p>
        <div className="card mt-4 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CountryFlag code={dailyConfig.countryCode} size="lg" />
            <div>
              <div className="font-display text-lg text-ink-100">{L(language, dailyCountry.name, dailyCountry.nameEn)}</div>
              <div className="text-xs text-ink-400">{L(language, dailyPosition.name, dailyPosition.nameEn)}</div>
            </div>
          </div>
          {doneToday ? (
            <div className="text-right text-sm text-ink-300">
              {ui(language, 'dailyChallengeAlreadyPlayed')}
              <div className="text-gold-400">
                {ui(language, 'scoreLabel')} {meta.dailyChallenge.lastScore}
              </div>
            </div>
          ) : (
            <button onClick={playDaily} className="btn-gold rounded-full px-6 py-2 text-sm">
              {ui(language, 'playDailyChallenge')}
            </button>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl text-ink-100">{ui(language, 'friendChallengeTitle')}</h2>
        <p className="mt-1 text-sm text-ink-300">{ui(language, 'friendChallengeSubtitle')}</p>
        <div className="card mt-4 flex flex-col gap-3 p-5">
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setCodeError(null);
            }}
            placeholder={ui(language, 'pasteCodePlaceholder')}
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-pitch-900/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none"
          />
          {codeError && <p className="text-sm text-red-400">{codeError}</p>}
          <button onClick={playFriendCode} disabled={!code.trim()} className="btn-gold rounded-full py-2 text-sm disabled:opacity-40">
            {ui(language, 'takeChallengeButton')}
          </button>
        </div>
        <p className="mt-3 text-xs text-ink-500">{ui(language, 'friendChallengeFooter')}</p>
      </section>
    </div>
  );
}
