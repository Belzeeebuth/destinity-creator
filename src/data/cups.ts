// Coupes nationales : noms réels et publics pour les pays où la pyramide de ligues est déjà
// connue avec confiance (voir data/leagues.ts) ; libellé générique honnête pour les autres,
// plutôt que d'inventer un nom qui n'existe pas.
const DOMESTIC_CUPS: Record<string, string> = {
  EN: 'FA Cup',
  ES: 'Copa del Rey',
  IT: 'Coppa Italia',
  DE: 'DFB-Pokal',
  PT: 'Taça de Portugal',
  FR: 'Coupe de France',
  NL: 'Coupe des Pays-Bas',
  BE: 'Coupe de Belgique',
  BR: 'Copa do Brasil',
  AR: 'Copa Argentina',
  TR: 'Coupe de Turquie',
  GR: 'Coupe de Grèce',
  MX: 'Copa MX',
  PL: 'Coupe de Pologne',
  DK: 'Coupe du Danemark',
  SE: 'Coupe de Suède',
  CH: 'Coupe de Suisse',
  AT: "Coupe d'Autriche",
  UA: "Coupe d'Ukraine",
  CZ: 'Coupe de République tchèque',
  HR: 'Coupe de Croatie',
  CO: 'Copa Colombia',
  CL: 'Copa Chile',
  PE: 'Copa Bicentenario',
  EC: 'Copa Ecuador',
  UY: 'Copa Uruguay',
  EG: "Coupe d'Égypte",
  MA: 'Coupe du Trône',
};

export function domesticCupName(countryCode: string): string {
  return DOMESTIC_CUPS[countryCode] ?? 'Coupe nationale';
}
