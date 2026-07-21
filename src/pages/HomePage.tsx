import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGameStore } from '../state/store';

export default function HomePage() {
  const career = useGameStore((s) => s.career);
  const abandonCareer = useGameStore((s) => s.abandonCareer);
  const navigate = useNavigate();
  const [confirmingNew, setConfirmingNew] = useState(false);

  function startFreshCareer() {
    abandonCareer();
    navigate('/creation');
  }

  return (
    <div className="flex flex-col items-center gap-14 py-6 text-center">
      <section className="flex max-w-2xl flex-col items-center gap-5">
        <span className="rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1 text-xs font-medium tracking-wide text-gold-400 uppercase">
          De 16 à 45 ans
        </span>
        <h1 className="font-display text-4xl font-semibold leading-tight text-ink-100 sm:text-6xl">
          Écris ta légende du <span className="text-gold-400">football</span>
        </h1>
        <p className="max-w-xl text-balance text-ink-300 sm:text-lg">
          De 16 à 45 ans, façonne une carrière de footballeur, saison après saison. Ton pays de départ,
          tes origines, ton mode de vie : chaque choix compte. Personne ne connaît son destin à l'avance.
        </p>

        {career && !career.retired ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Link to="/carriere" className="btn-gold rounded-full px-8 py-3 text-base">
                Reprendre ma carrière — {career.firstName} {career.lastName}
              </Link>
              <span className="text-xs text-ink-500">
                Saison {career.season} · {career.age} ans
              </span>
            </div>

            {!confirmingNew ? (
              <button
                onClick={() => setConfirmingNew(true)}
                className="text-xs text-ink-500 underline decoration-dotted underline-offset-2 hover:text-ink-300"
              >
                Commencer une nouvelle carrière à la place
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-xs text-ink-300">
                <p>
                  Ta carrière en cours ({career.firstName} {career.lastName}, saison {career.season}) sera
                  définitivement perdue. Confirmer ?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={startFreshCareer}
                    className="rounded-full border border-red-500/50 px-4 py-1.5 font-semibold text-red-400 transition hover:bg-red-500/10"
                  >
                    Oui, écraser et recommencer
                  </button>
                  <button onClick={() => setConfirmingNew(false)} className="btn-outline rounded-full px-4 py-1.5">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link to="/creation" className="btn-gold rounded-full px-8 py-3 text-base">
            Commencer ma carrière
          </Link>
        )}
      </section>

      <section className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to="/histoire" className="card animate-fade-in-up flex flex-col gap-2 p-5 text-left transition hover:border-gold-500/50">
          <span className="text-2xl">📖</span>
          <h2 className="font-display text-lg text-ink-100">Mode Histoire</h2>
          <p className="text-sm text-ink-300">Rejoue des carrières légendaires et tente de faire mieux qu'elles.</p>
        </Link>
        <Link to="/defis" className="card animate-fade-in-up flex flex-col gap-2 p-5 text-left transition hover:border-gold-500/50">
          <span className="text-2xl">🎯</span>
          <h2 className="font-display text-lg text-ink-100">Défi quotidien &amp; entre amis</h2>
          <p className="text-sm text-ink-300">Un point de départ commun chaque jour, ou un code à partager pour défier tes amis.</p>
        </Link>
        <Link to="/pantheon" className="card animate-fade-in-up flex flex-col gap-2 p-5 text-left transition hover:border-gold-500/50">
          <span className="text-2xl">🏛️</span>
          <h2 className="font-display text-lg text-ink-100">Panthéon</h2>
          <p className="text-sm text-ink-300">Découvre les légendes déjà écrites sur cet appareil.</p>
        </Link>
      </section>

      <section className="max-w-3xl text-sm text-ink-500">
        <p>
          90 pays jouables — des grandes nations du football aux plus petites micro-nations — influencent
          directement la difficulté de ta progression : concurrence, infrastructures, accès à la sélection nationale...
        </p>
      </section>
    </div>
  );
}
