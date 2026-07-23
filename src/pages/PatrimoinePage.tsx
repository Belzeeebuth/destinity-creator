import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGameStore } from '../state/store';
import { TRADITIONAL_INVESTMENTS, CRYPTO_INVESTMENTS, type InvestmentDefinition } from '../data/investments';
import { PRESTIGE_ASSETS } from '../data/prestige';
import { GIFT_TIERS, riskLabel, type GiftTierId } from '../engine/finance';
import type { InvestmentId, PlayerState } from '../engine/types';
import { formatMoney } from '../engine/util';
import { L, type Language } from '../i18n/language';
import { ui } from '../i18n/ui';

export default function PatrimoinePage() {
  const career = useGameStore((s) => s.career);
  const lastFinanceResult = useGameStore((s) => s.lastFinanceResult);
  const language = useGameStore((s) => s.language);
  const navigate = useNavigate();

  useEffect(() => {
    if (!career || career.retired) navigate('/');
  }, [career, navigate]);

  if (!career || career.retired) return null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link to="/carriere" className="text-xs text-ink-500 hover:text-ink-300">
          {ui(language, 'backToCareer')}
        </Link>
        <h1 className="mt-1 font-display text-3xl text-ink-100">{ui(language, 'patrimoineTitle')}</h1>
        <p className="mt-1 text-sm text-ink-300">{ui(language, 'patrimoineSubtitle')}</p>
      </div>

      <SavingsPanel career={career} language={language} />
      {lastFinanceResult && (
        <div className="rounded-lg bg-gold-500/10 px-4 py-2 text-sm text-gold-400">{lastFinanceResult}</div>
      )}
      <TraditionalInvestmentsPanel career={career} language={language} />
      <CryptoPanel career={career} language={language} />
      <PrestigePanel career={career} language={language} />
      <PersonalLifePanel career={career} language={language} />
    </div>
  );
}

function SavingsPanel({ career, language }: { career: PlayerState; language: Language }) {
  return (
    <div className="card flex flex-col items-center gap-1 p-6 text-center">
      <span className="text-xs uppercase tracking-wide text-ink-500">{ui(language, 'savingsAvailable')}</span>
      <span className="font-display text-3xl font-bold text-gold-400">{formatMoney(career.savings)}</span>
      <span className="text-xs text-ink-500">{ui(language, 'savingsHint')}</span>
    </div>
  );
}

function TraditionalInvestmentsPanel({ career, language }: { career: PlayerState; language: Language }) {
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
    <div className="panel-retro">
      <div className="panel-header-bar">
        <span>{ui(language, 'traditionalInvestmentsTitle')}</span>
      </div>
      <div className="p-5">
      <p className="text-sm text-ink-300">{ui(language, 'traditionalInvestmentsSubtitle')}</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TRADITIONAL_INVESTMENTS.map((def) => {
          const holding = career.investments[def.id];
          const gain = holding ? holding.value - holding.principal : 0;
          const gainPct = holding && holding.principal > 0 ? (gain / holding.principal) * 100 : 0;
          const risk = riskLabel(career.marketProfile[def.id]?.volatility ?? def.baseVolatility, language);
          return (
            <div key={def.id} className="flex flex-col gap-2 rounded-lg border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-lg text-ink-100">
                  {def.emoji} {L(language, def.name, def.nameEn)}
                </span>
              </div>
              <span className="w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${risk.color}22`, color: risk.color }}>
                {risk.label}
              </span>
              <p className="text-xs text-ink-400">{L(language, def.description, def.descriptionEn)}</p>

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
                <span className="text-xs text-ink-500">{ui(language, 'noPositionOpen')}</span>
              )}

              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder={ui(language, 'amountPlaceholder')}
                  value={amounts[def.id] ?? ''}
                  onChange={(e) => setAmounts((a) => ({ ...a, [def.id]: e.target.value }))}
                  className="w-full rounded-lg border border-white/15 bg-pitch-900 px-3 py-1.5 text-sm text-ink-100 outline-none focus:border-gold-500/60"
                />
                <button onClick={() => invest(def.id)} className="btn-outline shrink-0 rounded-full px-4 py-1.5 text-xs">
                  {ui(language, 'investButton')}
                </button>
              </div>
              {holding && (
                <button
                  onClick={() => withdrawFromPortfolio(def.id)}
                  className="w-full rounded-full border border-white/10 py-1.5 text-xs text-ink-300 transition hover:border-red-500/40 hover:text-red-400"
                >
                  {ui(language, 'withdrawAllButton')} ({formatMoney(holding.value)})
                </button>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

function CryptoPanel({ career, language }: { career: PlayerState; language: Language }) {
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
    <div className="panel-retro">
      <div className="panel-header-bar">
        <span>{ui(language, 'cryptoMarketTitle')}</span>
      </div>
      <div className="p-5">
      <p className="text-sm text-ink-300">
        {ui(language, 'cryptoMarketSubtitle').replace('{n}', String(CRYPTO_INVESTMENTS.length))}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-ink-500">
            <tr>
              <th className="pb-2">{ui(language, 'tableAsset')}</th>
              <th className="pb-2">{ui(language, 'tableRisk')}</th>
              <th className="pb-2">{ui(language, 'tablePosition')}</th>
              <th className="pb-2">{ui(language, 'tablePerformance')}</th>
              <th className="pb-2">{ui(language, 'tableAction')}</th>
            </tr>
          </thead>
          <tbody className="text-ink-300">
            {CRYPTO_INVESTMENTS.map((coin) => (
              <CryptoRow
                key={coin.id}
                coin={coin}
                language={language}
                holding={career.investments[coin.id]}
                volatility={career.marketProfile[coin.id]?.volatility ?? coin.baseVolatility}
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
    </div>
  );
}

function CryptoRow({
  coin,
  language,
  holding,
  volatility,
  amount,
  onAmountChange,
  onInvest,
  onWithdraw,
  expanded,
  onToggleExpand,
}: {
  coin: InvestmentDefinition;
  language: Language;
  holding: PlayerState['investments'][InvestmentId];
  volatility: number;
  amount: string;
  onAmountChange: (v: string) => void;
  onInvest: () => void;
  onWithdraw: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const gain = holding ? holding.value - holding.principal : 0;
  const gainPct = holding && holding.principal > 0 ? (gain / holding.principal) * 100 : 0;
  const risk = riskLabel(volatility, language);

  return (
    <>
      <tr className="border-t border-white/5">
        <td className="py-2">
          <button onClick={onToggleExpand} className="flex items-center gap-1.5 text-left hover:text-gold-400">
            <span aria-hidden>{coin.emoji}</span>
            <span className="font-medium text-ink-100">{L(language, coin.name, coin.nameEn)}</span>
            <span className="text-xs text-ink-500">{coin.symbol}</span>
          </button>
        </td>
        <td className="py-2">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${risk.color}22`, color: risk.color }}>
            {risk.label}
          </span>
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
              placeholder={ui(language, 'amountPlaceholder')}
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="w-24 rounded-lg border border-white/15 bg-pitch-900 px-2 py-1 text-xs text-ink-100 outline-none focus:border-gold-500/60"
            />
            <button onClick={onInvest} className="btn-outline shrink-0 rounded-full px-3 py-1 text-xs">
              {ui(language, 'investButton')}
            </button>
            {holding && (
              <button
                onClick={onWithdraw}
                className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-ink-300 transition hover:border-red-500/40 hover:text-red-400"
              >
                {ui(language, 'withdrawButton')}
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-white/5">
          <td colSpan={5} className="px-2 py-2 text-xs text-ink-400">
            {L(language, coin.description, coin.descriptionEn)}
          </td>
        </tr>
      )}
    </>
  );
}

function PrestigePanel({ career, language }: { career: PlayerState; language: Language }) {
  const purchasePrestigeAsset = useGameStore((s) => s.purchasePrestigeAsset);

  return (
    <div className="panel-retro">
      <div className="panel-header-bar">
        <span>{ui(language, 'prestigeTitle')}</span>
      </div>
      <div className="p-5">
      <p className="text-sm text-ink-300">{ui(language, 'prestigeSubtitle')}</p>
      {career.reputationShield > 0 && (
        <p className="mt-2 text-xs text-gold-400">
          {ui(language, 'reputationShieldActive').replace('{n}', String(Math.round(career.reputationShield * 100)))}
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PRESTIGE_ASSETS.map((asset) => {
          const owned = career.prestigeAssets.includes(asset.id);
          const canAfford = career.savings >= asset.cost;
          return (
            <div key={asset.id} className={`flex flex-col gap-2 rounded-lg border p-4 ${owned ? 'border-gold-500/50' : 'border-white/10'}`}>
              <span className="font-display text-lg text-ink-100">
                {asset.emoji} {L(language, asset.name, asset.nameEn)}
              </span>
              <span className="w-fit rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-ink-300">
                {asset.effect === 'permanent_reputation'
                  ? `+${asset.value} ${ui(language, 'reputationLabel')}`
                  : `${ui(language, 'shieldLabel')} -${Math.round(asset.value * 100)}%`}
              </span>
              <p className="text-xs text-ink-400">{L(language, asset.description, asset.descriptionEn)}</p>
              <button
                onClick={() => purchasePrestigeAsset(asset.id)}
                disabled={owned || !canAfford}
                className={`mt-1 w-full rounded-full py-1.5 text-xs disabled:opacity-40 ${owned ? 'btn-gold' : 'btn-outline'}`}
              >
                {owned ? ui(language, 'alreadyOwnedCheck') : `${ui(language, 'boutiqueBuyButton')} (${formatMoney(asset.cost)})`}
              </button>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

function PersonalLifePanel({ career, language }: { career: PlayerState; language: Language }) {
  const giftFamily = useGameStore((s) => s.giftFamily);
  const giftPartner = useGameStore((s) => s.giftPartner);
  const relationship = career.relationship;

  return (
    <div className="panel-retro">
      <div className="panel-header-bar">
        <span>{ui(language, 'personalLifeTitle')}</span>
      </div>
      <div className="p-5">

      <div className="rounded-lg border border-white/10 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink-100">
            {relationship.status === 'celibataire' && ui(language, 'statusSingle')}
            {relationship.status === 'en_couple' && `${ui(language, 'statusInCouple')} ${relationship.partnerName}`}
            {relationship.status === 'marie' && `${ui(language, 'statusMarried')} ${relationship.partnerName}`}
          </span>
          {relationship.status !== 'celibataire' && (
            <span className="text-xs text-ink-500">
              {ui(language, 'sinceSeasonLabel')} {relationship.since}
            </span>
          )}
        </div>
        {relationship.status !== 'celibataire' && (
          <div className="mt-2">
            <div className="flex justify-between text-[11px] text-ink-500">
              <span>{ui(language, 'closenessLabel')}</span>
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
        {relationship.status === 'celibataire' && <p className="mt-1 text-xs text-ink-500">{ui(language, 'singleHint')}</p>}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GiftGroup
          title={ui(language, 'giftsToFamily')}
          language={language}
          onGift={(tier) => giftFamily(tier)}
          disabled={false}
          savings={career.savings}
        />
        <GiftGroup
          title={ui(language, 'giftsToPartner')}
          language={language}
          onGift={(tier) => giftPartner(tier)}
          disabled={relationship.status === 'celibataire'}
          savings={career.savings}
        />
      </div>
      </div>
    </div>
  );
}

function GiftGroup({
  title,
  language,
  onGift,
  disabled,
  savings,
}: {
  title: string;
  language: Language;
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
            <span>{L(language, tier.label, tier.labelEn)}</span>
            <span>{formatMoney(tier.cost)}</span>
          </button>
        ))}
      </div>
      {disabled && <p className="mt-2 text-[11px] text-ink-500">{ui(language, 'giftAvailableInCouple')}</p>}
    </div>
  );
}
