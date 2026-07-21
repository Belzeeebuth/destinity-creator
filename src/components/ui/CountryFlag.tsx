import { flagEmoji } from '../../data/countries';

interface Props {
  code: string;
  size?: 'sm' | 'md' | 'lg';
  showCode?: boolean;
}

// Affiche le drapeau emoji ET son code pays en petite pastille : sous Windows (et certains
// environnements sans police d'émojis-drapeaux), l'emoji peut s'afficher comme un rectangle
// vide — le code reste lisible dans tous les cas.
export default function CountryFlag({ code, size = 'md', showCode = true }: Props) {
  const textSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-lg';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={textSize}>
        {flagEmoji(code)}
      </span>
      {showCode && (
        <span className="rounded bg-white/10 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-400">
          {code}
        </span>
      )}
    </span>
  );
}
