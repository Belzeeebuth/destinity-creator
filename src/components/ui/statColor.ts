// Palette par palier façon jeu de foot : la couleur d'une statistique reflète son niveau,
// du rouge (faible) au vert (excellent), indépendamment du fait que ce soit un attribut clé.
export function statTierColor(value: number): string {
  if (value < 40) return '#d8615a';
  if (value < 55) return '#e08a4a';
  if (value < 70) return '#e0b84a';
  if (value < 85) return '#a8c85a';
  return '#5fc878';
}
