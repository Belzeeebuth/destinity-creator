export interface Agent {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  description: string;
  descriptionEn: string;
  offerFrequencyModifier: number; // multiplicateur du nombre d'offres de club reçues
  offerQualityModifier: number; // multiplicateur de la qualité des offres (championnat/salaire)
  wageCommission: number; // pourcentage prélevé sur les revenus
  reputationModifier: number; // effet sur la progression de la notoriété
  pressureModifier: number; // influence sur la fréquence d'évènements "pression du clan"
}

export const AGENTS: Agent[] = [
  {
    id: 'aucun',
    name: 'Aucun représentant',
    nameEn: 'No representative',
    emoji: '🙅',
    description:
      "Tu gères tout toi-même : appels, négociations, dossiers. Tu gardes 100% de tes revenus mais tu rateras des opportunités que seul un réseau peut ouvrir.",
    descriptionEn:
      "You handle everything yourself: calls, negotiations, paperwork. You keep 100% of your income but you'll miss opportunities only a network can unlock.",
    offerFrequencyModifier: 0.7,
    offerQualityModifier: 0.85,
    wageCommission: 0,
    reputationModifier: 0.9,
    pressureModifier: 0.5,
  },
  {
    id: 'famille',
    name: 'Agence familiale',
    nameEn: 'Family agency',
    emoji: '👪',
    description:
      "Un proche — souvent un parent — gère ta carrière. La confiance est totale et la commission symbolique, mais le carnet d'adresses reste modeste.",
    descriptionEn:
      "A relative — often a parent — manages your career. Trust is total and the commission symbolic, but the contact book stays modest.",
    offerFrequencyModifier: 0.9,
    offerQualityModifier: 0.9,
    wageCommission: 3,
    reputationModifier: 1,
    pressureModifier: 0.6,
  },
  {
    id: 'local',
    name: 'Agent local indépendant',
    nameEn: 'Independent local agent',
    emoji: '🧳',
    description:
      "Un agent de licence qui connaît bien le championnat national. Un réseau correct pour trouver un club, sans accès aux grandes places européennes.",
    descriptionEn:
      "A licensed agent who knows the domestic league well. A decent network for finding a club, without access to the big European markets.",
    offerFrequencyModifier: 1.1,
    offerQualityModifier: 1,
    wageCommission: 8,
    reputationModifier: 1.05,
    pressureModifier: 1,
  },
  {
    id: 'agence',
    name: 'Grande agence internationale',
    nameEn: 'Major international agency',
    emoji: '🌐',
    description:
      "Un cabinet puissant, connecté aux plus grands clubs de la planète. Les portes s'ouvrent plus vite et plus grand — mais la pression aux résultats et les commissions grimpent en flèche.",
    descriptionEn:
      "A powerful firm, connected to the biggest clubs on the planet. Doors open faster and wider — but results pressure and commissions skyrocket.",
    offerFrequencyModifier: 1.4,
    offerQualityModifier: 1.3,
    wageCommission: 15,
    reputationModifier: 1.2,
    pressureModifier: 1.6,
  },
];

export function getAgent(id: string): Agent {
  const found = AGENTS.find((a) => a.id === id);
  if (!found) throw new Error(`Agent inconnu: ${id}`);
  return found;
}
