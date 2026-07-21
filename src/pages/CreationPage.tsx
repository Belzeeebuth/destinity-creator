import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CountryStep from '../components/creation/CountryStep';
import PositionStep from '../components/creation/PositionStep';
import SimpleChoiceGrid from '../components/creation/SimpleChoiceGrid';
import { BACKGROUNDS } from '../data/backgrounds';
import { LIFESTYLES } from '../data/lifestyles';
import { AGENTS } from '../data/agents';
import { getCountry, flagEmoji, TIER_INFO } from '../data/countries';
import { getPosition, type PositionCode } from '../data/positions';
import { useGameStore } from '../state/store';
import { newRandomSeed } from '../engine/rng';

const STEPS = ['Pays', 'Poste', 'Origine', 'Mode de vie', 'Représentation', 'Résumé'];

export default function CreationPage() {
  const navigate = useNavigate();
  const startCareer = useGameStore((s) => s.startCareer);
  const equippedAdvantageIds = useGameStore((s) => s.meta.equippedAdvantageIds);

  const [step, setStep] = useState(0);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [positionCode, setPositionCode] = useState<PositionCode | null>(null);
  const [backgroundId, setBackgroundId] = useState<string | null>(null);
  const [lifestyleId, setLifestyleId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0: return !!countryCode;
      case 1: return !!positionCode;
      case 2: return !!backgroundId;
      case 3: return !!lifestyleId;
      case 4: return !!agentId;
      default: return true;
    }
  }, [step, countryCode, positionCode, backgroundId, lifestyleId, agentId]);

  function handleStart() {
    if (!countryCode || !positionCode || !backgroundId || !lifestyleId || !agentId) return;
    startCareer({
      countryCode,
      positionCode,
      backgroundId,
      lifestyleId,
      agentId,
      firstName,
      lastName,
      seed: newRandomSeed(),
      mode: 'classic',
      advantagesEquipped: equippedAdvantageIds,
    });
    navigate('/carriere');
  }

  return (
    <div className="mx-auto max-w-4xl">
      <ol className="mb-8 flex flex-wrap items-center gap-2 text-xs text-ink-500">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full border text-[11px] ${
                i === step
                  ? 'border-gold-500 bg-gold-500/20 text-gold-400'
                  : i < step
                    ? 'border-gold-500/40 text-gold-400'
                    : 'border-white/15 text-ink-500'
              }`}
            >
              {i + 1}
            </span>
            <span className={i === step ? 'text-ink-100' : ''}>{label}</span>
            {i < STEPS.length - 1 && <span className="text-ink-700">—</span>}
          </li>
        ))}
      </ol>

      <div className="card min-h-[420px] p-6">
        {step === 0 && <CountryStep value={countryCode} onSelect={setCountryCode} />}
        {step === 1 && <PositionStep value={positionCode} onSelect={setPositionCode} />}
        {step === 2 && (
          <SimpleChoiceGrid
            title="Choisis ton origine sociale"
            subtitle="Ton milieu d'origine influence tes attributs de départ et ta résilience face aux épreuves."
            items={BACKGROUNDS}
            value={backgroundId}
            onSelect={setBackgroundId}
          />
        )}
        {step === 3 && (
          <SimpleChoiceGrid
            title="Choisis ton mode de vie d'adolescent"
            subtitle="Ta discipline quotidienne influence ta vitesse de progression et tes risques de blessure ou d'incident."
            items={LIFESTYLES}
            value={lifestyleId}
            onSelect={setLifestyleId}
          />
        )}
        {step === 4 && (
          <SimpleChoiceGrid
            title="Choisis ta représentation"
            subtitle="Ton agent influence la fréquence et la qualité des offres de club que tu recevras."
            items={AGENTS}
            value={agentId}
            onSelect={setAgentId}
          />
        )}
        {step === 5 && countryCode && positionCode && backgroundId && lifestyleId && agentId && (
          <SummaryStep
            countryCode={countryCode}
            positionCode={positionCode}
            backgroundId={backgroundId}
            lifestyleId={lifestyleId}
            agentId={agentId}
            firstName={firstName}
            lastName={lastName}
            setFirstName={setFirstName}
            setLastName={setLastName}
          />
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="btn-outline rounded-full px-5 py-2 text-sm disabled:opacity-30"
        >
          ← Retour
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={!canAdvance}
            className="btn-gold rounded-full px-6 py-2 text-sm disabled:opacity-40"
          >
            Continuer →
          </button>
        ) : (
          <button onClick={handleStart} className="btn-gold rounded-full px-6 py-2 text-sm">
            Commencer ma carrière ⚽
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryStep({
  countryCode,
  positionCode,
  backgroundId,
  lifestyleId,
  agentId,
  firstName,
  lastName,
  setFirstName,
  setLastName,
}: {
  countryCode: string;
  positionCode: PositionCode;
  backgroundId: string;
  lifestyleId: string;
  agentId: string;
  firstName: string;
  lastName: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
}) {
  const country = getCountry(countryCode);
  const position = getPosition(positionCode);
  const background = BACKGROUNDS.find((b) => b.id === backgroundId)!;
  const lifestyle = LIFESTYLES.find((l) => l.id === lifestyleId)!;
  const agent = AGENTS.find((a) => a.id === agentId)!;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-2xl text-ink-100">Dernière étape avant le coup d'envoi</h2>
        <p className="mt-1 text-sm text-ink-300">Vérifie ton profil (et donne-lui un nom si tu le souhaites).</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Prénom (auto si vide)"
          className="rounded-lg border border-white/10 bg-pitch-900/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none"
        />
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Nom (auto si vide)"
          className="rounded-lg border border-white/10 bg-pitch-900/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-500/50 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <SummaryRow label="Pays" value={`${flagEmoji(country.code)} ${country.name}`} sub={TIER_INFO[country.tier].difficulty} />
        <SummaryRow label="Poste" value={position.name} sub={position.short} />
        <SummaryRow label="Origine" value={background.name} />
        <SummaryRow label="Mode de vie" value={lifestyle.name} />
        <SummaryRow label="Représentation" value={agent.name} />
        <SummaryRow label="Âge de départ" value="16 ans" sub="Retraite obligatoire à 45 ans" />
      </div>
    </div>
  );
}

function SummaryRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-ink-500">{label}</div>
      <div className="mt-0.5 font-display text-lg text-ink-100">{value}</div>
      {sub && <div className="text-xs text-ink-400">{sub}</div>}
    </div>
  );
}
