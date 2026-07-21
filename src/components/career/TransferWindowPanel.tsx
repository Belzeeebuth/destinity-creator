import { useState } from 'react';
import type { PlayerState } from '../../engine/types';
import { getClubTier } from '../../data/clubs';
import { getCountry } from '../../data/countries';
import { formatMoney } from '../../engine/util';
import { useGameStore } from '../../state/store';
import CountryFlag from '../ui/CountryFlag';

const ROLE_LABEL: Record<string, string> = {
  titulaire: 'Titulaire annoncé',
  rotation: "Rotation d'effectif",
  reserviste: 'Réserviste',
};

export default function TransferWindowPanel({ career }: { career: PlayerState }) {
  const acceptOffer = useGameStore((s) => s.acceptOffer);
  const declineOffers = useGameStore((s) => s.declineOffers);
  const negotiateOffer = useGameStore((s) => s.negotiateOffer);
  const lastNegotiationResult = useGameStore((s) => s.lastNegotiationResult);
  const [negotiatingIndex, setNegotiatingIndex] = useState<number | null>(null);

  return (
    <div className="card p-5">
      <h2 className="font-display text-2xl text-ink-100">
        {career.club ? '🔁 Mercato' : '🔍 Trouve ton premier club'}
      </h2>
      <p className="mt-1 text-sm text-ink-300">
        {career.club
          ? `Des clubs s'intéressent à toi. Rester à ${career.club.name} reste possible.`
          : "Voici les propositions reçues pour démarrer ta carrière professionnelle."}
      </p>

      {lastNegotiationResult && (
        <div className="mt-3 rounded-lg bg-gold-500/10 px-4 py-2 text-sm text-gold-400">{lastNegotiationResult}</div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {career.pendingOffers.map((offer, i) => {
          const tier = getClubTier(offer.tierIndex);
          const country = getCountry(offer.countryCode);
          const negotiating = negotiatingIndex === i;
          return (
            <div key={`${offer.clubName}-${i}`} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-lg text-ink-100">{offer.clubName}</span>
                <CountryFlag code={offer.countryCode} />
              </div>
              <div className="text-xs text-ink-400">
                {tier.label} · {country.name}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-300">{formatMoney(offer.wage)}/an</span>
                <span className="text-ink-500">{ROLE_LABEL[offer.role]}</span>
              </div>
              {offer.signingBonus > 0 && (
                <div className="text-xs text-gold-400">Prime à la signature : {formatMoney(offer.signingBonus)}</div>
              )}
              {offer.releaseClause && (
                <div className="text-xs text-ink-400">Clause libératoire : {formatMoney(offer.releaseClause)}</div>
              )}

              {negotiating && !offer.negotiated ? (
                <div className="mt-1 flex flex-col gap-1.5 rounded-lg bg-black/20 p-2">
                  <button
                    onClick={() => { negotiateOffer(i, 'wage'); setNegotiatingIndex(null); }}
                    className="btn-outline rounded-lg py-1.5 text-xs"
                  >
                    💰 Négocier le salaire
                  </button>
                  <button
                    onClick={() => { negotiateOffer(i, 'role'); setNegotiatingIndex(null); }}
                    className="btn-outline rounded-lg py-1.5 text-xs"
                  >
                    🧢 Exiger le statut de titulaire
                  </button>
                  <button
                    onClick={() => { negotiateOffer(i, 'clause'); setNegotiatingIndex(null); }}
                    className="btn-outline rounded-lg py-1.5 text-xs"
                  >
                    📜 Exiger une clause libératoire
                  </button>
                </div>
              ) : (
                <div className="mt-1 flex gap-2">
                  <button onClick={() => acceptOffer(i)} className="btn-gold flex-1 rounded-full py-1.5 text-sm">
                    Signer
                  </button>
                  {!offer.negotiated && (
                    <button
                      onClick={() => setNegotiatingIndex(i)}
                      className="btn-outline rounded-full px-3 py-1.5 text-sm"
                      title="Négocier les termes du contrat"
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
        {career.club ? 'Rester à mon club actuel' : 'Rester libre cette saison'}
      </button>
    </div>
  );
}
