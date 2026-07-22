import { useGameStore } from '../../state/store';
import { ui } from '../../i18n/ui';

export default function Footer() {
  const language = useGameStore((s) => s.language);
  return (
    <footer className="relative mt-auto py-8 text-center text-xs text-ink-500">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pitch-500/60 to-transparent" />
      <div className="mx-auto flex max-w-xl flex-col items-center gap-1.5 px-4">
        <span className="text-sm text-gold-500/80" aria-hidden>
          ⚽
        </span>
        <p>{ui(language, 'footerTagline')}</p>
        <p>{ui(language, 'footerPrivacy')}</p>
      </div>
    </footer>
  );
}
