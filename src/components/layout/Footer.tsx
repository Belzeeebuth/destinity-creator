export default function Footer() {
  return (
    <footer className="relative mt-auto py-8 text-center text-xs text-ink-500">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pitch-500/60 to-transparent" />
      <div className="mx-auto flex max-w-xl flex-col items-center gap-1.5 px-4">
        <span className="text-sm text-gold-500/80" aria-hidden>
          ⚽
        </span>
        <p>Destiny Eleven — recréation fan-made et indépendante, jouée entièrement dans ton navigateur.</p>
        <p>
          Aucune collecte de données, aucun cookie tiers : ta progression est sauvegardée uniquement sur cet
          appareil (stockage local).
        </p>
      </div>
    </footer>
  );
}
