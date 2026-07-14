/**
 * Petit graphique en barres horizontales, sans dépendance externe (pas de
 * recharts) : proportionné au besoin (2 graphiques simples dans une page
 * admin à faible trafic), évite d'ajouter une librairie de charts pour si
 * peu. Server Component — pas d'interactivité nécessaire.
 */
export function DownloadBarChart({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3 text-sm">
          <span className="w-20 shrink-0 font-medium">{item.label}</span>
          <span className="bg-secondary h-5 flex-1 overflow-hidden rounded">
            <span
              className="bg-primary block h-full rounded"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </span>
          <span className="text-muted-foreground w-10 shrink-0 text-right tabular-nums">
            {item.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
