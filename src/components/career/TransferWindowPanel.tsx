import type { PlayerState } from '../../engine/types';
import { getClubTier } from '../../data/clubs';
import { flagEmoji, getCountry } from '../../data/countries';
import { formatMoney } from '../../engine/util';
import { useGameStore } from '../../state/store';

const ROLE_LABEL: Record<string, string> = {
  titulaire: 'Titulaire annoncé',
  rotation: "Rotation d'effectif",
  reserviste: 'Réserviste',
};

export default function TransferWindowPanel({ career }: { career: PlayerState }) {
  const acceptOffer = useGameStore((s) => s.acceptOffer);
  const declineOffers = useGameStore((s) => s.declineOffers);

  return (
    <div className="card p-5">
      <h2 className="font-display text-2xl text-ink-100">
        {career.club ? 'Mercato' : 'Trouve ton premier club'}
      </h2>
      <p className="mt-1 text-sm text-ink-300">
        {career.club
          ? `Des clubs s'intéressent à toi. Rester à ${career.club.name} reste possible.`
          : "Voici les propositions reçues pour démarrer ta carrière professionnelle."}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {career.pendingOffers.map((offer, i) => {
          const tier = getClubTier(offer.tierIndex);
          const country = getCountry(offer.countryCode);
          return (
            <div key={`${offer.clubName}-${i}`} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-lg text-ink-100">{offer.clubName}</span>
                <span className="text-lg">{flagEmoji(offer.countryCode)}</span>
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
              <button onClick={() => acceptOffer(i)} className="btn-gold mt-1 rounded-full py-1.5 text-sm">
                Signer
              </button>
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
