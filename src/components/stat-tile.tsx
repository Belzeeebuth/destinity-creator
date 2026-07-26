/**
 * Tuile de statistique : libellé en casse de phrase, valeur en chiffres
 * proportionnels (tabular-nums fait paraître un grand nombre distendu), détail
 * optionnel en dessous.
 */
export function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-hairline bg-surface p-4">
      <p className="text-sm text-ink-secondary">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {detail ? <p className="mt-0.5 text-sm text-ink-muted">{detail}</p> : null}
    </div>
  );
}
