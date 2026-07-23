import { useState } from 'react';
import type { PlayerState } from '../../engine/types';
import { resolveClubTier } from '../../data/clubs';
import { getCountry } from '../../data/countries';
import { formatMoney } from '../../engine/util';
import { useGameStore } from '../../state/store';
import { L } from '../../i18n/language';
import { ui, type UiKey } from '../../i18n/ui';
import CountryFlag from '../ui/CountryFlag';

const ROLE_LABEL_KEY: Record<string, UiKey> = {
  titulaire: 'roleTitulaire',
  rotation: 'roleRotation',
  reserviste: 'roleReserviste',
};

export default function TransferWindowPanel({ career }: { career: PlayerState }) {
  const acceptOffer = useGameStore((s) => s.acceptOffer);
  const declineOffers = useGameStore((s) => s.declineOffers);
  const negotiateOffer = useGameStore((s) => s.negotiateOffer);
  const lastNegotiationResult = useGameStore((s) => s.lastNegotiationResult);
  const language = useGameStore((s) => s.language);
  const [negotiatingIndex, setNegotiatingIndex] = useState<number | null>(null);

  return (
    <div className="panel-retro">
      <div className="panel-header-bar">
        <span>{career.club ? ui(language, 'transferMercatoTitle') : ui(language, 'transferFirstClubTitle')}</span>
      </div>
      <div className="p-5">
      <p className="text-sm text-ink-300">
        {career.club
          ? `${ui(language, 'transferMercatoSubPrefix')} ${career.club.name} ${ui(language, 'transferMercatoSubSuffix')}`
          : ui(language, 'transferFirstClubSub')}
      </p>

      {lastNegotiationResult && (
        <div className="mt-3 rounded-lg bg-gold-500/10 px-4 py-2 text-sm text-gold-400">{lastNegotiationResult}</div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {career.pendingOffers.map((offer, i) => {
          const tier = resolveClubTier(offer, language);
          const country = getCountry(offer.countryCode);
          const negotiating = negotiatingIndex === i;
          return (
            <div key={`${offer.clubName}-${i}`} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-lg text-ink-100">{offer.clubName}</span>
                <CountryFlag code={offer.countryCode} />
              </div>
              <div className="text-xs text-ink-400">
                {tier.label} · {L(language, country.name, country.nameEn)}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-300">
                  {formatMoney(offer.wage)}
                  {ui(language, 'perYearShort')}
                </span>
                <span className="text-ink-500">{ui(language, ROLE_LABEL_KEY[offer.role])}</span>
              </div>
              {offer.signingBonus > 0 && (
                <div className="text-xs text-gold-400">
                  {ui(language, 'signingBonusLabel')} {formatMoney(offer.signingBonus)}
                </div>
              )}
              {offer.releaseClause && (
                <div className="text-xs text-ink-400">
                  {ui(language, 'releaseClauseLabel')} {formatMoney(offer.releaseClause)}
                </div>
              )}

              {negotiating && !offer.negotiated ? (
                <div className="mt-1 flex flex-col gap-1.5 rounded-lg bg-black/20 p-2">
                  <button
                    onClick={() => { negotiateOffer(i, 'wage'); setNegotiatingIndex(null); }}
                    className="btn-outline rounded-lg py-1.5 text-xs"
                  >
                    {ui(language, 'negotiateWage')}
                  </button>
                  <button
                    onClick={() => { negotiateOffer(i, 'role'); setNegotiatingIndex(null); }}
                    className="btn-outline rounded-lg py-1.5 text-xs"
                  >
                    {ui(language, 'negotiateRole')}
                  </button>
                  <button
                    onClick={() => { negotiateOffer(i, 'clause'); setNegotiatingIndex(null); }}
                    className="btn-outline rounded-lg py-1.5 text-xs"
                  >
                    {ui(language, 'negotiateClause')}
                  </button>
                </div>
              ) : (
                <div className="mt-1 flex gap-2">
                  <button onClick={() => acceptOffer(i)} className="btn-gold flex-1 rounded-full py-1.5 text-sm">
                    {ui(language, 'signButton')}
                  </button>
                  {!offer.negotiated && (
                    <button
                      onClick={() => setNegotiatingIndex(i)}
                      className="btn-outline rounded-full px-3 py-1.5 text-sm"
                      title={ui(language, 'negotiateTitle')}
                    >
                      🤝
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={declineOffers} className="btn-outline mt-5 w-full rounded-full py-2 text-sm">
        {career.club ? ui(language, 'stayAtCurrentClub') : ui(language, 'stayFreeAgent')}
      </button>
      </div>
    </div>
  );
}
