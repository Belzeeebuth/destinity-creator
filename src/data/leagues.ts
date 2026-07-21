// Pyramides de divisions réelles (nom, prestige, salaire de référence, clubs) pour les pays
// dont la structure de championnat est fiable et bien connue. Permet de démarrer en bas de
// l'échelle (division amateur/inférieure) et de gravir les échelons via montées/descentes.
// Les pays absents de cette table gardent le système générique de paliers (voir clubs.ts /
// realClubs.ts) plutôt que de se voir attribuer de fausses divisions inventées.
import type { Rng } from '../engine/rng';
import { pick } from '../engine/rng';

export interface Division {
  level: number; // 1 = division la plus élevée
  name: string; // vrai nom de la division
  prestige: number; // 0-100, cohérent avec CLUB_TIERS pour les pays sans pyramide
  wageBase: number; // salaire annuel de référence en €
  clubs: string[];
}

export interface CountryLeagueSystem {
  divisions: Division[]; // trié du niveau 1 (sommet) vers le plus bas
}

function d(level: number, name: string, prestige: number, wageBase: number, clubs: string[]): Division {
  return { level, name, prestige, wageBase, clubs };
}

export const LEAGUE_SYSTEMS: Record<string, CountryLeagueSystem> = {
  EN: {
    divisions: [
      d(1, 'Premier League', 100, 3_000_000, ['Arsenal FC', 'Manchester City', 'Liverpool FC', 'Manchester United', 'Chelsea FC', 'Tottenham Hotspur', 'Newcastle United', 'Aston Villa', 'West Ham United', 'Everton FC', 'Brighton & Hove Albion', 'Wolverhampton Wanderers', 'Crystal Palace', 'Fulham FC', 'Brentford FC', 'Nottingham Forest', 'AFC Bournemouth', 'Burnley FC']),
      d(2, 'EFL Championship', 68, 600_000, ['Leeds United', 'Leicester City', 'Southampton FC', 'West Bromwich Albion', 'Norwich City', 'Middlesbrough FC', 'Sunderland AFC', 'Coventry City', 'Hull City', 'Millwall FC', 'Watford FC', 'Stoke City', 'Preston North End', 'Bristol City', 'Queens Park Rangers', 'Blackburn Rovers']),
      d(3, 'EFL League One', 38, 150_000, ['Portsmouth FC', 'Derby County', 'Bolton Wanderers', 'Peterborough United', 'Barnsley FC', 'Charlton Athletic', 'Blackpool FC', 'Oxford United', 'Reading FC', 'Exeter City']),
      d(4, 'EFL League Two', 20, 60_000, ['Notts County', 'Mansfield Town', 'Stockport County', 'Walsall FC', 'Gillingham FC', 'Doncaster Rovers', 'Colchester United', 'Crawley Town']),
      d(5, 'National League', 9, 22_000, ['Solihull Moors', 'Chesterfield FC', 'Altrincham FC', 'York City', 'Boston United', 'Barnet FC', 'Woking FC', 'Dagenham & Redbridge']),
    ],
  },
  ES: {
    divisions: [
      d(1, 'LaLiga', 98, 2_500_000, ['Real Madrid', 'FC Barcelone', 'Atlético Madrid', 'Séville FC', 'Real Sociedad', 'Villarreal CF', 'Athletic Bilbao', 'Real Betis', 'Valence CF', 'Celta Vigo', 'CA Osasuna', 'Girona FC', 'Rayo Vallecano', 'RCD Majorque', 'Getafe CF', 'UD Las Palmas', 'Deportivo Alavés', 'Cadix CF']),
      d(2, 'LaLiga 2', 52, 350_000, ['Levante UD', 'Real Saragosse', 'Real Oviedo', 'Sporting Gijón', 'Racing Santander', 'SD Eibar', 'Elche CF', 'Albacete Balompié', 'CD Tenerife', 'Burgos CF', 'CD Mirandés']),
      d(3, 'Primera Federación', 24, 55_000, ['Real Madrid Castilla', 'Barcelona Atlètic', 'Nàstic Tarragona', 'Real Murcia', 'Hércules CF', 'UD Ibiza']),
      d(4, 'Segunda Federación', 11, 15_000, ['CD Toledo', 'Atlético Baleares', 'Real Balompédica Linense', 'CD Badajoz']),
    ],
  },
  IT: {
    divisions: [
      d(1, 'Serie A', 97, 2_400_000, ['Juventus FC', 'Inter Milan', 'AC Milan', 'SSC Naples', 'AS Rome', 'SS Lazio', 'Atalanta BC', 'ACF Fiorentina', 'Bologna FC', 'Torino FC', 'Udinese Calcio', 'US Sassuolo', 'AC Monza', 'Cagliari Calcio', 'Empoli FC', 'Hellas Vérone', 'US Lecce', 'Genoa CFC']),
      d(2, 'Serie B', 48, 300_000, ['Parma Calcio', 'US Palerme', 'SSC Bari', 'UC Sampdoria', 'Venise FC', 'US Cremonese', 'Modène FC', 'AS Cittadella', 'Ternana Calcio', 'Cosenza Calcio']),
      d(3, 'Serie C', 22, 45_000, ['Calcio Padova', 'US Triestina', 'LR Vicenza', 'Novara Calcio', 'Delfino Pescara', 'US Catanzaro', 'SS Juve Stabia']),
      d(4, 'Serie D', 9, 10_000, ['Gubbio 1910', 'Chieti Calcio', 'ASD Sangiovannese', 'US Fezzanese']),
    ],
  },
  DE: {
    divisions: [
      d(1, 'Bundesliga', 96, 2_200_000, ['Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen', 'Eintracht Francfort', 'VfB Stuttgart', 'Borussia Mönchengladbach', 'VfL Wolfsburg', 'SC Freiburg', 'Werder Brême', 'FSV Mayence 05', '1. FC Union Berlin', 'FC Augsbourg', 'TSG Hoffenheim']),
      d(2, '2. Bundesliga', 52, 350_000, ['FC Schalke 04', 'Hambourg SV', 'Hertha BSC', '1. FC Cologne', 'Fortuna Düsseldorf', 'Hanovre 96', 'Karlsruher SC', 'FC St. Pauli', 'Greuther Fürth', '1. FC Kaiserslautern']),
      d(3, '3. Liga', 24, 55_000, ['Dynamo Dresde', 'Energie Cottbus', 'Rot-Weiss Essen', 'SC Verl', 'SV Waldhof Mannheim', 'FC Ingolstadt']),
      d(4, 'Regionalliga', 11, 14_000, ['Bahlinger SC', 'FC Schweinfurt 05', 'FC Rielasingen-Arlen']),
    ],
  },
  PT: {
    divisions: [
      d(1, 'Liga Portugal', 82, 700_000, ['SL Benfica', 'FC Porto', 'Sporting CP', 'SC Braga', 'Vitória de Guimarães', 'Boavista FC', 'Rio Ave FC', 'FC Famalicão', 'Estoril Praia', 'Moreirense FC', 'Gil Vicente', 'Portimonense SC', 'Casa Pia AC']),
      d(2, 'Liga Portugal 2', 34, 90_000, ['Académico de Viseu', 'CD Feirense', 'CD Mafra', 'FC Penafiel', 'Leixões SC', 'Länk Vilaverdense']),
      d(3, 'Campeonato de Portugal', 14, 12_000, ['Sporting da Covilhã', 'CF Os Belenenses', 'AD Fabril', 'SC Amora']),
    ],
  },
  FR: {
    divisions: [
      d(1, 'Ligue 1', 88, 1_400_000, ['Paris Saint-Germain', 'Olympique de Marseille', 'Olympique Lyonnais', 'AS Monaco', 'LOSC Lille', 'RC Lens', 'Stade Rennais', 'OGC Nice', 'FC Nantes', 'Stade de Reims', 'RC Strasbourg', 'Montpellier HSC', 'Toulouse FC', 'Stade Brestois', 'Le Havre AC', 'FC Metz', 'Angers SCO', 'AJ Auxerre']),
      d(2, 'Ligue 2', 40, 180_000, ['AS Saint-Étienne', 'SC Bastia', 'EA Guingamp', 'Stade Lavallois', 'Grenoble Foot', 'Amiens SC', 'Rodez AF', 'Pau FC', 'ES Troyes AC', 'AC Ajaccio', 'SM Caen', 'USL Dunkerque']),
      d(3, 'National', 18, 30_000, ['AS Nancy Lorraine', 'US Concarneau', 'US Boulogne', 'Cholet FC', 'FC Villefranche', 'FBBP01 Bourg-en-Bresse']),
      d(4, 'National 2', 8, 8_000, ['US Avranches', 'Le Puy Foot', 'FC Chambly Oise', 'US Sedan Ardennes']),
    ],
  },
  NL: {
    divisions: [
      d(1, 'Eredivisie', 78, 500_000, ['Ajax Amsterdam', 'PSV Eindhoven', 'Feyenoord Rotterdam', 'AZ Alkmaar', 'FC Twente', 'FC Utrecht', 'Vitesse Arnhem', 'SC Heerenveen', 'Go Ahead Eagles', 'Sparta Rotterdam', 'NEC Nimègue', 'Fortuna Sittard', 'Heracles Almelo', 'RKC Waalwijk', 'FC Volendam']),
      d(2, 'Eerste Divisie', 30, 70_000, ['Willem II', 'De Graafschap', 'Roda JC Kerkrade', 'FC Den Bosch', 'FC Eindhoven', 'MVV Maastricht', 'SC Cambuur']),
    ],
  },
  BE: {
    divisions: [
      d(1, 'Jupiler Pro League', 75, 450_000, ['Club Bruges KV', 'RSC Anderlecht', 'KRC Genk', 'Union Saint-Gilloise', 'Royal Antwerp FC', 'KAA La Gantoise', 'Standard de Liège', 'Sporting Charleroi', 'KVC Westerlo', 'KV Courtrai', 'Cercle Bruges']),
      d(2, 'Challenger Pro League', 28, 50_000, ['K Beerschot VA', 'Lommel SK', 'RWD Molenbeek', 'KMSK Deinze', 'Lierse Kempenzonen']),
    ],
  },
  BR: {
    divisions: [
      d(1, 'Série A', 90, 900_000, ['Flamengo', 'Palmeiras', 'São Paulo FC', 'Corinthians', 'Santos FC', 'Grêmio', 'Internacional', 'Cruzeiro', 'Atlético Mineiro', 'Fluminense', 'Botafogo', 'Vasco da Gama', 'Bahia', 'Fortaleza EC']),
      d(2, 'Série B', 40, 120_000, ['Sport Recife', 'Coritiba FC', 'Guarani FC', 'Ponte Preta', 'Vila Nova FC', 'CRB', 'Novorizontino', 'Avaí FC']),
      d(3, 'Série C', 18, 25_000, ['Confiança', 'ABC FC', 'São Bernardo FC', 'Ferroviária']),
      d(4, 'Série D', 8, 6_000, ['Retrô FC', 'Central SC', 'Maranhão AC']),
    ],
  },
  AR: {
    divisions: [
      d(1, 'Primera División', 85, 200_000, ['River Plate', 'Boca Juniors', 'Racing Club', 'Independiente', 'San Lorenzo', 'Vélez Sarsfield', 'Estudiantes de La Plata', 'Talleres', 'Argentinos Juniors', 'Rosario Central', "Newell's Old Boys", 'Huracán', 'Banfield', 'Lanús', 'Defensa y Justicia', 'Gimnasia La Plata']),
      d(2, 'Primera Nacional', 30, 30_000, ['Chacarita Juniors', 'Almagro', 'Deportivo Morón', 'Ferro Carril Oeste', 'Gimnasia de Jujuy', 'Estudiantes de Río Cuarto']),
      d(3, 'Primera B Metropolitana', 12, 8_000, ['Deportivo Armenio', 'Club Atlético Colegiales', 'Argentino de Quilmes']),
    ],
  },
  TR: {
    divisions: [
      d(1, 'Süper Lig', 70, 400_000, ['Galatasaray SK', 'Fenerbahçe SK', 'Beşiktaş JK', 'Trabzonspor', 'İstanbul Başakşehir', 'Konyaspor', 'Sivasspor', 'Alanyaspor', 'Antalyaspor', 'Kasımpaşa SK']),
      d(2, '1. Lig', 30, 60_000, ['Bandırmaspor', 'Adana Demirspor', 'Boluspor', 'Manisa FK', 'Sakaryaspor']),
      d(3, '2. Lig', 12, 10_000, ['Bugsaşspor', 'Bucaspor 1928', 'Kastamonuspor']),
    ],
  },
  GR: {
    divisions: [
      d(1, 'Super League 1', 55, 150_000, ['Olympiacos Le Pirée', 'PAOK Salonique', 'AEK Athènes', 'Panathinaïkos', 'Aris Salonique', 'Asteras Tripolis', 'Volos NFC', 'Atromitos']),
      d(2, 'Super League 2', 20, 18_000, ['Kallithea FC', 'AO Kavala', 'Apollon Larissas', 'PAS Lamia']),
    ],
  },
  MX: {
    divisions: [
      d(1, 'Liga MX', 65, 250_000, ['Club América', 'Chivas de Guadalajara', 'Cruz Azul', 'Tigres UANL', 'CF Monterrey', 'CF Pachuca', 'Deportivo Toluca', 'Santos Laguna', 'Atlas FC', 'Club León', 'Pumas UNAM', 'Club Necaxa']),
      d(2, 'Liga de Expansión MX', 25, 40_000, ['Mineros de Zacatecas', 'Correcaminos UAT', 'Alebrijes de Oaxaca', 'Tampico Madero FC', 'Cancún FC']),
    ],
  },
  PL: {
    divisions: [
      d(1, 'Ekstraklasa', 45, 90_000, ['Legia Varsovie', 'Lech Poznań', 'Raków Częstochowa', 'Piast Gliwice', 'Wisła Cracovie', 'Śląsk Wrocław', 'Górnik Zabrze', 'Pogoń Szczecin']),
      d(2, 'I Liga', 18, 15_000, ['Widzew Łódź', 'Arka Gdynia', 'GKS Katowice', 'Odra Opole']),
    ],
  },
  DK: {
    divisions: [
      d(1, 'Superliga', 48, 100_000, ['FC Copenhague', 'Brøndby IF', 'FC Midtjylland', 'AGF Aarhus', 'OB Odense', 'Randers FC', 'Silkeborg IF', 'Viborg FF']),
      d(2, '1. Division', 18, 15_000, ['Hvidovre IF', 'Kolding IF', 'Vendsyssel FF', 'FC Fredericia']),
    ],
  },
  SE: {
    divisions: [
      d(1, 'Allsvenskan', 45, 90_000, ['Malmö FF', 'Hammarby IF', 'AIK Solna', 'Djurgårdens IF', 'IFK Göteborg', 'BK Häcken', 'IFK Norrköping', 'IF Elfsborg']),
      d(2, 'Superettan', 16, 12_000, ['Örebro SK', 'Helsingborgs IF', 'GAIS', 'Degerfors IF']),
    ],
  },
  CH: {
    divisions: [
      d(1, 'Super League', 55, 150_000, ['BSC Young Boys', 'FC Bâle', 'Servette FC', 'FC Lugano', 'FC Zurich', 'FC Saint-Gall', 'FC Lucerne', 'FC Lausanne-Sport']),
      d(2, 'Challenge League', 18, 20_000, ['FC Thoune', 'FC Aarau', 'FC Schaffhouse', 'FC Vaduz']),
    ],
  },
  AT: {
    divisions: [
      d(1, 'Bundesliga', 48, 100_000, ['RB Salzbourg', 'Rapid Vienne', 'Austria Vienne', 'LASK Linz', 'Sturm Graz', 'Wolfsberger AC']),
      d(2, '2. Liga', 16, 12_000, ['SV Ried', 'Austria Klagenfurt', 'Kapfenberger SV', 'SKU Amstetten']),
    ],
  },
  UA: {
    divisions: [
      d(1, 'Premier League', 40, 60_000, ['Shakhtar Donetsk', 'Dynamo Kiev', 'Dnipro-1', 'Zorya Louhansk', 'Vorskla Poltava']),
      d(2, 'Persha Liha', 15, 8_000, ['Chornomorets Odessa', 'Poltava FC', 'Rukh Lviv']),
    ],
  },
  CZ: {
    divisions: [
      d(1, 'Chance Liga', 42, 70_000, ['Slavia Prague', 'Sparta Prague', 'Viktoria Plzeň', 'Baník Ostrava', 'Sigma Olomouc', 'Mladá Boleslav']),
      d(2, 'FNL', 15, 10_000, ['FK Pardubice', 'FK Ústí nad Labem', 'FK Přerov']),
    ],
  },
  HR: {
    divisions: [
      d(1, 'HNL', 42, 70_000, ['GNK Dinamo Zagreb', 'HNK Hajduk Split', 'HNK Rijeka', 'NK Osijek', 'HNK Gorica']),
      d(2, 'Prva NL', 14, 8_000, ['NK Slaven Belupo', 'NK Varaždin', 'NK Istra 1961']),
    ],
  },
  CO: {
    divisions: [
      d(1, 'Categoría Primera A', 55, 60_000, ['Atlético Nacional', 'Millonarios FC', 'América de Cali', 'Junior de Barranquilla', 'Deportivo Cali', 'Independiente Medellín', 'Once Caldas', 'Deportes Tolima']),
      d(2, 'Primera B', 15, 8_000, ['Boyacá Chicó', 'Real Cartagena', 'Deportes Quindío']),
    ],
  },
  CL: {
    divisions: [
      d(1, 'Primera División', 48, 50_000, ['Colo-Colo', 'Universidad de Chile', 'Universidad Católica', "O'Higgins FC", 'Palestino', 'Audax Italiano']),
      d(2, 'Primera B', 15, 6_000, ['Deportes La Serena', 'Santiago Morning', 'Cobresal']),
    ],
  },
  PE: {
    divisions: [
      d(1, 'Liga 1', 40, 35_000, ['Universitario de Deportes', 'Alianza Lima', 'Sporting Cristal', 'FBC Melgar', 'Cienciano']),
      d(2, 'Liga 2', 12, 5_000, ['Deportivo Coopsol', 'Atlético Grau', 'Los Chankas']),
    ],
  },
  EC: {
    divisions: [
      d(1, 'LigaPro Serie A', 42, 35_000, ['Barcelona SC', 'Emelec', 'LDU Quito', 'Independiente del Valle', 'CD Aucas']),
      d(2, 'Serie B', 12, 5_000, ['Cumbayá FC', 'Mushuc Runa', 'Técnico Universitario']),
    ],
  },
  UY: {
    divisions: [
      d(1, 'Primera División', 55, 60_000, ['Peñarol', 'Nacional', 'Defensor Sporting', 'Danubio FC', 'Liverpool FC Montevideo']),
      d(2, 'Segunda División', 15, 6_000, ['Montevideo Wanderers', 'Cerro FC', 'Rentistas']),
    ],
  },
  EG: {
    divisions: [
      d(1, 'Egyptian Premier League', 45, 50_000, ['Al Ahly', 'Zamalek SC', 'Pyramids FC', 'Al Ittihad Alexandria', 'ENPPI', 'Ismaily SC']),
      d(2, 'Second Division', 12, 5_000, ['El Gouna FC', 'Ghazl El Mahalla', 'Tala’ea El Gaish']),
    ],
  },
  MA: {
    divisions: [
      d(1, 'Botola Pro 1', 45, 40_000, ['Wydad Casablanca', 'Raja Casablanca', 'FUS Rabat', 'RS Berkane', 'AS FAR', 'Hassania Agadir']),
      d(2, 'Botola Pro 2', 12, 5_000, ['Chabab Mohammédia', 'Olympique Safi', 'Maghreb de Fès']),
    ],
  },
};

export function hasLeagueSystem(countryCode: string): boolean {
  return countryCode in LEAGUE_SYSTEMS;
}

export function getLeagueSystem(countryCode: string): CountryLeagueSystem | undefined {
  return LEAGUE_SYSTEMS[countryCode];
}

export function maxDivisionLevel(countryCode: string): number {
  const sys = LEAGUE_SYSTEMS[countryCode];
  return sys ? sys.divisions.length : 0;
}

export function divisionAt(countryCode: string, level: number): Division | undefined {
  const sys = LEAGUE_SYSTEMS[countryCode];
  if (!sys) return undefined;
  return sys.divisions.find((div) => div.level === level);
}

export function pickClubFromDivision(
  countryCode: string,
  level: number,
  rng: Rng,
  avoid: string[] = [],
): string {
  const division = divisionAt(countryCode, level);
  const pool = division?.clubs ?? [];
  if (pool.length === 0) return 'Club amateur local';
  const fresh = pool.filter((c) => !avoid.includes(c));
  return pick(rng, fresh.length > 0 ? fresh : pool);
}

// Tirage du niveau de division ciblé par une offre : centré sur le niveau courant du joueur
// (réalisme des transferts : on ne saute pas d'une division amateur à l'élite en un contrat),
// mais influencé par le potentiel du joueur pour permettre montées rapides en cas de forte
// performance, ou offres moins bonnes si l'on stagne.
export function weightedDivisionLevel(
  countryCode: string,
  currentLevel: number,
  biasedScore: number,
  rng: Rng,
): number {
  const sys = LEAGUE_SYSTEMS[countryCode];
  if (!sys) return currentLevel;
  const weighted = sys.divisions.map((division) => {
    const levelDistance = Math.abs(division.level - currentLevel);
    const prestigeDiff = biasedScore - division.prestige;
    const prestigeWeight = Math.exp(-(prestigeDiff * prestigeDiff) / (2 * 16 * 16));
    const distancePenalty = Math.exp(-(levelDistance * levelDistance) / (2 * 1.3 * 1.3));
    return { level: division.level, weight: prestigeWeight * distancePenalty };
  });
  const total = weighted.reduce((s, w) => s + w.weight, 0);
  if (total <= 0) return currentLevel;
  let r = rng() * total;
  for (const w of weighted) {
    r -= w.weight;
    if (r <= 0) return w.level;
  }
  return weighted[weighted.length - 1].level;
}
