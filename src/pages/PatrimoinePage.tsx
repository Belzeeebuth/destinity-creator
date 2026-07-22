import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGameStore } from '../state/store';
import { TRADITIONAL_INVESTMENTS, CRYPTO_INVESTMENTS, type InvestmentDefinition } from '../data/investments';
import { GIFT_TIERS, type GiftTierId } from '../engine/finance';
import type { InvestmentId, PlayerState } from '../engine/types';
import { formatMoney } from '../engine/util';

export default function PatrimoinePage() {
  const career = useGameStore((s) => s.career);
  const lastFinanceResult = useGameStore((s) => s.lastFinanceResult);
  const navigate = useNavigate();

  useEffect(() => {
    if (!career || career.retired) navigate('/');
  }, [career, navigate]);

  if (!career || career.retired) return null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link to="/carriere" className="text-xs text-ink-500 hover:text-ink-300">
          ← Retour à ma carrière
        </Link>
        <h1 className="mt-1 font-display text-3xl text-ink-100">💰 Patrimoine &amp; vie privée</h1>
        <p className="mt-1 text-sm text-ink-300">
          Ce que tu deviens ne se joue pas que sur le terrain : fais fructifier ton argent et prends soin de tes proches.
        </p>
      </div>

      <SavingsPanel career={career} />
      {lastFinanceResult && (
        <div className="rounded-lg bg-gold-500/10 px-4 py-2 text-sm text-gold-400">{lastFinanceResult}</div>
      )}
      <TraditionalInvestmentsPanel career={career} />
      <CryptoPanel career={career} />
      <PersonalLifePanel career={career} />
    </div>
  );
}

function SavingsPanel({ career }: { career: PlayerState }) {
  return (
    <div className="card flex flex-col items-center gap-1 p-6 text-center">
      <span className="text-xs uppercase tracking-wide text-ink-500">Épargne disponible</span>
      <span className="font-display text-3xl font-bold text-gold-400">{formatMoney(career.savings)}</span>
      <span className="text-xs text-ink-500">Alimentée automatiquement par une partie de ton salaire net à chaque fin de saison.</span>
    </div>
  );
}

function TraditionalInvestmentsPanel({ career }: { career: PlayerState }) {
  const investInPortfolio = useGameStore((s) => s.investInPortfolio);
  const withdrawFromPortfolio = useGameStore((s) => s.withdrawFromPortfolio);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  function invest(id: InvestmentId) {
    const raw = Number(amounts[id]);
    if (!raw || raw <= 0) return;
    investInPortfolio(id, raw);
    setAmounts((a) => ({ ...a, [id]: '' }));
  }

  return (
    <div className="card p-5">
      <h2 className="font-display text-xl text-ink-100">📊 Investissements traditionnels</h2>
      <p className="mt-1 text-sm text-ink-300">
        Chaque actif évolue à sa manière en fin de saison : rendement moyen, volatilité et risque de krach propres à chaque
        classe.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TRADITIONAL_INVESTMENTS.map((def) => {
          const holding = career.investments[def.id];
          const gain = holding ? holding.value - holding.principal : 0;
          const gainPct = holding && holding.principal > 0 ? (gain / holding.principal) * 100 : 0;
          return (
            <div key={def.id} className="flex flex-col gap-2 rounded-lg border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-lg text-ink-100">
                  {def.emoji} {def.name}
                </span>
              </div>
              <p className="text-xs text-ink-400">{def.description}</p>

              {holding ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-200">{formatMoney(holding.value)}</span>
                  <span className={gain >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {gain >= 0 ? '+' : ''}
                    {formatMoney(gain)} ({gainPct >= 0 ? '+' : ''}
                    {gainPct.toFixed(1)}%)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-ink-500">Aucune position ouverte.</span>
              )}

              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Montant"
                  value={amounts[def.id] ?? ''}
                  onChange={(e) => setAmounts((a) => ({ ...a, [def.id]: e.target.value }))}
                  className="w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-1.5 text-sm text-ink-100 outline-none focus:border-gold-500/60"
                />
                <button onClick={() => invest(def.id)} className="btn-outline shrink-0 rounded-full px-4 py-1.5 text-xs">
                  Investir
                </button>
              </div>
              {holding && (
                <button
                  onClick={() => withdrawFromPortfolio(def.id)}
                  className="w-full rounded-full border border-white/10 py-1.5 text-xs text-ink-300 transition hover:border-red-500/40 hover:text-red-400"
                >
                  Tout retirer ({formatMoney(holding.value)})
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CryptoPanel({ career }: { career: PlayerState }) {
  const investInPortfolio = useGameStore((s) => s.investInPortfolio);
  const withdrawFromPortfolio = useGameStore((s) => s.withdrawFromPortfolio);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<InvestmentId | null>(null);

  function invest(id: InvestmentId) {
    const raw = Number(amounts[id]);
    if (!raw || raw <= 0) return;
    investInPortfolio(id, raw);
    setAmounts((a) => ({ ...a, [id]: '' }));
  }

  return (
    <div className="card p-5">
      <h2 className="font-display text-xl text-ink-100">🪙 Marché crypto</h2>
      <p className="mt-1 text-sm text-ink-300">
        Neuf actifs distincts, du plus établi au plus spéculatif. Marché fictif entièrement simulé par le jeu — aucun cours
        réel n'est répliqué.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-ink-500">
            <tr>
              <th className="pb-2">Actif</th>
              <th className="pb-2">Position</th>
              <th className="pb-2">Performance</th>
              <th className="pb-2">Action</th>
            </tr>
          </thead>
          <tbody className="text-ink-300">
            {CRYPTO_INVESTMENTS.map((coin) => (
              <CryptoRow
                key={coin.id}
                coin={coin}
                holding={career.investments[coin.id]}
                amount={amounts[coin.id] ?? ''}
                onAmountChange={(v) => setAmounts((a) => ({ ...a, [coin.id]: v }))}
                onInvest={() => invest(coin.id)}
                onWithdraw={() => withdrawFromPortfolio(coin.id)}
                expanded={expanded === coin.id}
                onToggleExpand={() => setExpanded((e) => (e === coin.id ? null : coin.id))}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CryptoRow({
  coin,
  holding,
  amount,
  onAmountChange,
  onInvest,
  onWithdraw,
  expanded,
  onToggleExpand,
}: {
  coin: InvestmentDefinition;
  holding: PlayerState['investments'][InvestmentId];
  amount: string;
  onAmountChange: (v: string) => void;
  onInvest: () => void;
  onWithdraw: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const gain = holding ? holding.value - holding.principal : 0;
  const gainPct = holding && holding.principal > 0 ? (gain / holding.principal) * 100 : 0;

  return (
    <>
      <tr className="border-t border-white/5">
        <td className="py-2">
          <button onClick={onToggleExpand} className="flex items-center gap-1.5 text-left hover:text-gold-400">
            <span aria-hidden>{coin.emoji}</span>
            <span className="font-medium text-ink-100">{coin.name}</span>
            <span className="text-xs text-ink-500">{coin.symbol}</span>
          </button>
        </td>
        <td className="py-2">{holding ? formatMoney(holding.value) : '—'}</td>
        <td className="py-2">
          {holding ? (
            <span className={gain >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {gain >= 0 ? '+' : ''}
              {gainPct.toFixed(1)}%
            </span>
          ) : (
            '—'
          )}
        </td>
        <td className="py-2">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              placeholder="Montant"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="w-24 rounded-lg border border-white/15 bg-pitch-900 px-2 py-1 text-xs text-ink-100 outline-none focus:border-gold-500/60"
            />
            <button onClick={onInvest} className="btn-outline shrink-0 rounded-full px-3 py-1 text-xs">
              Investir
            </button>
            {holding && (
              <button
                onClick={onWithdraw}
                className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-ink-300 transition hover:border-red-500/40 hover:text-red-400"
              >
                Retirer
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-white/5">
          <td colSpan={4} className="px-2 py-2 text-xs text-ink-400">
            {coin.description}
          </td>
        </tr>
      )}
    </>
  );
}

function PersonalLifePanel({ career }: { career: PlayerState }) {
  const giftFamily = useGameStore((s) => s.giftFamily);
  const giftPartner = useGameStore((s) => s.giftPartner);
  const relationship = career.relationship;

  return (
    <div className="card p-5">
      <h2 className="font-display text-xl text-ink-100">❤️ Vie privée</h2>

      <div className="mt-3 rounded-lg border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink-100">
            {relationship.status === 'celibataire' && '💔 Célibataire'}
            {relationship.status === 'en_couple' && `💑 En couple avec ${relationship.partnerName}`}
            {relationship.status === 'marie' && `💍 Marié(e) à ${relationship.partnerName}`}
          </span>
          {relationship.status !== 'celibataire' && <span className="text-xs text-ink-500">Depuis la saison {relationship.since}</span>}
        </div>
        {relationship.status !== 'celibataire' && (
          <div className="mt-2">
            <div className="flex justify-between text-[11px] text-ink-500">
              <span>Complicité</span>
              <span>{Math.round(relationship.happiness)}</span>
            </div>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${relationship.happiness}%`,
                  backgroundColor: relationship.happiness >= 60 ? '#8fd0a6' : relationship.happiness >= 35 ? '#e8b94a' : '#e48a8a',
                }}
              />
            </div>
          </div>
        )}
        {relationship.status === 'celibataire' && (
          <p className="mt-1 text-xs text-ink-500">Une rencontre peut survenir au fil des évènements de saison.</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GiftGroup title="🎁 Cadeaux à la famille" onGift={(tier) => giftFamily(tier)} disabled={false} savings={career.savings} />
        <GiftGroup
          title="🎁 Cadeaux au/à la partenaire"
          onGift={(tier) => giftPartner(tier)}
          disabled={relationship.status === 'celibataire'}
          savings={career.savings}
        />
      </div>
    </div>
  );
}

function GiftGroup({
  title,
  onGift,
  disabled,
  savings,
}: {
  title: string;
  onGift: (tier: GiftTierId) => void;
  disabled: boolean;
  savings: number;
}) {
  return (
    <div className="rounded-lg border border-white/10 p-4">
      <span className="text-sm font-medium text-ink-100">{title}</span>
      <div className="mt-2 flex flex-col gap-2">
        {GIFT_TIERS.map((tier) => (
          <button
            key={tier.id}
            onClick={() => onGift(tier.id)}
            disabled={disabled || savings < tier.cost}
            className="btn-outline flex items-center justify-between rounded-full px-4 py-1.5 text-xs disabled:opacity-40"
          >
            <span>{tier.label}</span>
            <span>{formatMoney(tier.cost)}</span>
          </button>
        ))}
      </div>
      {disabled && <p className="mt-2 text-[11px] text-ink-500">Disponible une fois en couple.</p>}
    </div>
  );
}
