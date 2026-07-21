// Vrais noms de clubs, par pays, triés autant que possible du plus modeste au plus prestigieux.
// Utilisé pour générer des offres de club crédibles (le tirage se fait dans une fenêtre
// centrée sur le palier de prestige demandé). Couvre les 90 pays jouables.
import type { Rng } from '../engine/rng';
import { pick } from '../engine/rng';

export const REAL_CLUBS: Record<string, string[]> = {
  // ---- Tier S ----
  BR: ['Vila Nova', 'CRB', 'Sampaio Corrêa', 'Náutico', 'Criciúma', 'Goiás', 'Ceará', 'Coritiba', 'Sport Recife', 'Fortaleza', 'Bahia', 'Athletico Paranaense', 'Cruzeiro', 'Vasco da Gama', 'Botafogo', 'Internacional', 'Grêmio', 'Fluminense', 'Santos', 'Atlético Mineiro', 'São Paulo', 'Corinthians', 'Palmeiras', 'Flamengo'],
  FR: ['Clermont Foot', 'Le Havre AC', 'Stade Brestois', 'Toulouse FC', 'FC Metz', 'Angers SCO', 'Stade de Reims', 'RC Lens', 'Montpellier HSC', 'FC Nantes', 'Stade Rennais', 'RC Strasbourg', 'AJ Auxerre', 'OGC Nice', 'LOSC Lille', 'AS Saint-Étienne', 'AS Monaco', 'Olympique Lyonnais', 'Olympique de Marseille', 'Paris Saint-Germain'],
  AR: ['Arsenal de Sarandí', 'Central Córdoba', 'Platense', 'Gimnasia La Plata', 'Talleres', 'Argentinos Juniors', 'Rosario Central', "Newell's Old Boys", 'Vélez Sarsfield', 'Estudiantes de La Plata', 'Racing Club', 'San Lorenzo', 'Independiente', 'River Plate', 'Boca Juniors'],
  ES: ['SD Eibar', 'CD Leganés', 'Cádiz CF', 'Girona FC', 'RCD Mallorca', 'Rayo Vallecano', 'Real Betis', 'Celta de Vigo', 'Real Sociedad', 'Athletic Bilbao', 'Villarreal CF', 'Valencia CF', 'Sevilla FC', 'Atlético Madrid', 'FC Barcelone', 'Real Madrid'],
  DE: ['SC Freiburg', 'FSV Mayence 05', 'VfL Bochum', '1. FC Union Berlin', 'VfL Wolfsburg', 'Eintracht Francfort', 'Werder Brême', "Borussia Mönchengladbach", 'VfB Stuttgart', 'Bayer Leverkusen', 'RB Leipzig', 'Borussia Dortmund', 'FC Schalke 04', 'Hambourg SV', 'Bayern Munich'],
  EN: ['Luton Town', 'Burnley FC', 'Sheffield United', 'Nottingham Forest', 'Brentford FC', 'Crystal Palace', 'Fulham FC', 'Everton FC', 'West Ham United', 'Aston Villa', 'Newcastle United', 'Tottenham Hotspur', 'Chelsea FC', 'Arsenal FC', 'Manchester United', 'Liverpool FC', 'Manchester City'],
  PT: ['Gil Vicente', 'Moreirense FC', 'Boavista FC', 'Rio Ave FC', 'Vitória de Guimarães', 'CD Santa Clara', 'Estoril Praia', 'Portimonense SC', 'SC Braga', 'Sporting CP', 'FC Porto', 'SL Benfica'],
  IT: ['US Salernitana', 'Cagliari Calcio', 'Empoli FC', 'Hellas Vérone', 'Torino FC', 'Udinese Calcio', 'Sassuolo Calcio', 'Bologna FC', 'ACF Fiorentina', 'Atalanta BC', 'AS Roma', 'SS Lazio', 'SSC Napoli', 'Juventus FC', 'Inter Milan', 'AC Milan'],
  NL: ['FC Volendam', 'Sparta Rotterdam', 'RKC Waalwijk', 'Go Ahead Eagles', 'Heracles Almelo', 'FC Utrecht', 'FC Twente', 'Vitesse Arnhem', 'SC Heerenveen', 'AZ Alkmaar', 'Feyenoord Rotterdam', 'PSV Eindhoven', 'Ajax Amsterdam'],
  BE: ['KVC Westerlo', 'KV Courtrai', 'Cercle Bruges', 'KAA La Gantoise', 'Standard de Liège', 'Royal Antwerp FC', 'RSC Anderlecht', 'Club Bruges KV'],

  // ---- Tier A ----
  HR: ['NK Osijek', 'HNK Rijeka', 'HNK Gorica', 'NK Slaven Belupo', 'HNK Hajduk Split', 'GNK Dinamo Zagreb'],
  UY: ['Defensor Sporting', 'Danubio FC', 'Liverpool FC Montevideo', 'Montevideo Wanderers', 'Cerro FC', 'Racing Club de Montevideo', 'Nacional', 'Peñarol'],
  CO: ['Deportes Tolima', 'Independiente Medellín', 'Once Caldas', 'Deportivo Cali', 'América de Cali', 'Junior de Barranquilla', 'Millonarios FC', 'Atlético Nacional'],
  MX: ['Mazatlán FC', 'Querétaro FC', 'Club Puebla', 'Necaxa', 'Atlas FC', 'Santos Laguna', 'Deportivo Toluca', 'CF Pachuca', 'CF Monterrey', 'Tigres UANL', 'Cruz Azul', 'Club América', 'Chivas de Guadalajara'],
  US: ['Austin FC', 'Nashville SC', 'Charlotte FC', 'Real Salt Lake', 'Portland Timbers', 'Sporting Kansas City', 'Atlanta United FC', 'Seattle Sounders FC', 'LA Galaxy', 'Inter Miami CF'],
  MA: ['Chabab Mohammédia', 'Hassania Agadir', 'Difaâ El Jadidi', 'Olympique de Safi', 'FUS Rabat', 'Maghreb de Fès', 'Wydad Casablanca', 'Raja Casablanca'],
  SN: ['Casa Sports', 'Diambars FC', 'Teungueth FC', 'Jaraaf de Dakar', 'ASC Diaraf', 'Génération Foot', 'US Gorée'],
  NG: ['Sunshine Stars', 'Wikki Tourists', 'Plateau United', 'Rivers United', 'Kano Pillars', 'Enyimba FC', 'Enugu Rangers'],
  GH: ['Berekum Chelsea', 'Karela United', 'Aduana Stars', 'Ashanti Gold SC', 'Medeama SC', 'Asante Kotoko', 'Accra Hearts of Oak'],
  CI: ['San Pedro FC', 'Africa Sports', 'ASEC Mimosas', "Stade d'Abidjan", 'SOL FC', 'Séwé Sport'],
  RS: ['FK Radnički Niš', 'FK Vojvodina', 'FK Napredak', 'FK Čukarički', 'FK Partizan', 'FK Crvena Zvezda'],
  PL: ['Górnik Zabrze', 'Piast Gliwice', 'Śląsk Wrocław', 'Wisła Cracovie', 'Lech Poznań', 'Legia Varsovie'],
  DK: ['Randers FC', 'AGF Aarhus', 'OB Odense', 'Brøndby IF', 'FC Midtjylland', 'FC Copenhague'],
  SE: ['IFK Norrköping', 'Djurgårdens IF', 'BK Häcken', 'AIK Solna', 'Hammarby IF', 'Malmö FF'],
  CH: ['FC Lausanne-Sport', 'FC Lucerne', 'FC Saint-Gall', 'Grasshopper Zurich', 'FC Bâle', 'BSC Young Boys'],
  AT: ['WSG Tirol', 'SV Ried', 'Wolfsberger AC', 'LASK Linz', 'Rapid Vienne', 'RB Salzbourg'],
  WA: ['Newport County', 'Wrexham AFC', "Connah's Quay Nomads", 'The New Saints', 'Cardiff City', 'Swansea City'],
  UA: ['FC Oleksandriya', 'Chornomorets Odessa', 'Vorskla Poltava', 'Zorya Louhansk', 'Dynamo Kiev', 'Shakhtar Donetsk'],
  JP: ['Shonan Bellmare', 'Sagan Tosu', 'Avispa Fukuoka', 'Urawa Red Diamonds', 'Yokohama F. Marinos', 'Kashima Antlers'],
  KR: ['Daegu FC', 'Gangwon FC', 'Suwon Samsung Bluewings', 'Pohang Steelers', 'FC Séoul', 'Jeonbuk Hyundai Motors'],
  EG: ['Smouha SC', 'Ismaily SC', 'ENPPI', 'El Gouna FC', 'Al Ahly', 'Zamalek SC'],
  DZ: ['MC Oran', 'USM Alger', 'JS Saoura', 'CR Belouizdad', 'ES Sétif', 'JS Kabylie'],
  TN: ['CS Sfaxien', 'Stade Tunisien', 'CA Bizertin', 'US Monastir', 'Club Africain', 'Espérance de Tunis'],
  CL: ['Deportes Antofagasta', 'Palestino', 'Audax Italiano', "O'Higgins FC", 'Universidad Católica', 'Universidad de Chile', 'Colo-Colo'],
  EC: ['Delfín SC', 'Aucas', 'Deportivo Cuenca', 'Independiente del Valle', 'Emelec', 'Barcelona SC', 'LDU Quito'],
  PE: ['Cusco FC', 'Sport Huancayo', 'Cienciano', 'FBC Melgar', 'Sporting Cristal', 'Alianza Lima', 'Universitario de Deportes'],
  TR: ['Kasımpaşa SK', 'Sivasspor', 'Alanyaspor', 'Konyaspor', 'Beşiktaş JK', 'Trabzonspor', 'Fenerbahçe SK', 'Galatasaray SK'],
  GR: ['PAS Giannina', 'Volos NFC', 'Atromitos', 'Aris Salonique', 'AEK Athènes', 'PAOK Salonique', 'Panathinaïkos', 'Olympiacos Le Pirée'],
  CZ: ['FC Zlín', 'Bohemians 1905', 'FK Mladá Boleslav', 'Viktoria Plzeň', 'Sparta Prague', 'Slavia Prague'],

  // ---- Tier B ----
  IS: ['Fram Reykjavík', 'Breiðablik', 'Víkingur Reykjavík', 'Valur Reykjavík', 'FH Hafnarfjörður', 'KR Reykjavík'],
  FI: ['Ilves Tampere', 'Inter Turku', 'KuPS Kuopio', 'SJK Seinäjoki', 'HJK Helsinki'],
  NO: ['Sarpsborg 08', 'Viking FK', 'Molde FK', 'Bodø/Glimt', 'Rosenborg BK'],
  IE: ['Sligo Rovers', 'Bohemian FC', "St Patrick's Athletic", 'Dundalk FC', 'Shamrock Rovers'],
  SK: ['FC Nitra', 'MFK Ružomberok', 'AS Trenčín', 'ŠK Slovan Bratislava', 'MŠK Žilina'],
  SI: ['NK Celje', 'NK Maribor', 'NK Domžale', 'NK Olimpija Ljubljana'],
  HU: ['Kisvárda FC', 'Paksi FC', 'Debreceni VSC', 'Fehérvár FC', 'Ferencváros TC'],
  RO: ['FC Botoșani', 'Universitatea Craiova', 'Rapid Bucarest', 'FCSB', 'CFR Cluj'],
  BG: ['Botev Plovdiv', 'Cherno More Varna', 'Levski Sofia', 'Ludogorets Razgrad', 'CSKA Sofia'],
  BA: ['NK Široki Brijeg', 'FK Sarajevo', 'HŠK Zrinjski Mostar', 'FK Željezničar', 'FK Borac Banja Luka'],
  MK: ['FK Rabotnički', 'FK Shkëndija', 'FK Vardar'],
  AL: ['KF Tirana', 'KF Skënderbeu', 'KF Partizani Tirana', 'KF Teuta'],
  IL: ['Bnei Sakhnin', 'Hapoël Beer-Sheva', 'Beitar Jérusalem', 'Maccabi Haïfa', 'Maccabi Tel-Aviv', 'Hapoël Tel-Aviv'],
  IR: ['Sanat Naft Abadan', 'Foolad FC', 'Zob Ahan Esfahan', 'Sepahan FC', 'Esteghlal Téhéran', 'Persepolis FC'],
  SA: ['Al-Fateh', 'Al-Taawoun', 'Al-Ittihad Djeddah', 'Al-Ahli Djeddah', 'Al-Nassr', 'Al-Hilal'],
  QA: ['Al-Wakrah SC', 'Al-Arabi SC', 'Al-Gharafa SC', 'Al-Rayyan SC', 'Al-Duhail SC', 'Al Sadd SC'],
  AE: ['Ajman Club', 'Al Wasl FC', 'Sharjah FC', 'Al Ain FC', 'Al Wahda FC', 'Al Jazira Club'],
  AU: ['Macarthur FC', 'Western United', 'Newcastle Jets', 'Adelaide United', 'Wellington Phoenix', 'Melbourne Victory', 'Sydney FC'],
  NZ: ['Team Wellington', 'Hamilton Wanderers', 'Waitakere United', 'Auckland City FC'],
  CA: ['Pacific FC', 'Cavalry FC', 'York United FC', 'Forge FC', 'CF Montréal', 'Vancouver Whitecaps', 'Toronto FC'],
  CR: ['Municipal Grecia', 'Guanacasteca', 'CS Herediano', 'Deportivo Saprissa', 'Alajuelense'],
  JM: ['Vere United', 'Cavalier FC', 'Waterhouse FC', 'Portmore United'],
  PA: ['Sporting San Miguelito', 'Tauro FC', 'San Francisco FC', 'CD Árabe Unido'],
  HN: ['Real Sociedad Tocoa', 'CD Vida', 'Real España', 'FC Motagua', 'CD Olimpia'],
  ZA: ['Chippa United', 'Stellenbosch FC', 'SuperSport United', 'Mamelodi Sundowns', 'Orlando Pirates', 'Kaizer Chiefs'],
  CM: ['Coton Sport de Garoua', 'Union de Douala', 'PWD Bamenda', 'Canon Yaoundé'],
  ML: ['Djoliba AC', 'Stade Malien', 'AS Real Bamako', 'Onze Créateurs de Niaréla'],
  BF: ['Rahimo FC', 'US Ouagadougou', 'Étoile Filante de Ouagadougou', 'ASFA Yennenga'],
  CD: ['AS Vita Club', 'Daring Club Motema Pembe', 'FC Saint-Éloi Lupopo', 'TP Mazembe'],
  ZM: ['Green Buffaloes', 'Power Dynamos', 'Nkana FC', 'Zesco United'],
  UG: ['Vipers SC', 'KCCA FC', 'SC Villa', 'URA FC'],
  KE: ['Tusker FC', 'AFC Leopards', 'Gor Mahia'],
  CN: ['Wuhan Three Towns', 'Beijing Guoan', 'Shandong Taishan', 'Shanghai Port', 'Shanghai Shenhua'],
  IN: ['NorthEast United FC', 'Chennaiyin FC', 'Kerala Blasters', 'ATK Mohun Bagan', 'Bengaluru FC', 'Mumbai City FC'],
  VN: ['Hà Nội FC', 'Hoàng Anh Gia Lai', 'Becamex Bình Dương', 'Viettel FC'],
  TH: ['Chiangrai United', 'Bangkok United', 'Muangthong United', 'Buriram United'],
  ID: ['Persib Bandung', 'Bali United', 'Persija Jakarta', 'Arema FC'],

  // ---- Tier C ----
  EE: ['Nõmme Kalju', 'JK Tulevik', 'FCI Levadia', 'FC Flora Tallinn'],
  LV: ['FK Liepāja', 'Valmiera FC', 'RFS Riga', 'Riga FC'],
  LT: ['FK Panevėžys', 'FK Riteriai', 'FK Sūduva', 'Žalgiris Vilnius'],
  GE: ['FC Locomotive Tbilissi', 'FC Saburtalo', 'Torpedo Koutaïssi', 'Dinamo Tbilissi'],
  AM: ['Ararat-Armenia', 'Alashkert FC', 'FC Pyunik', 'Noah Erevan'],
  AZ: ['Sabah FK', 'Sumgayit FK', 'Neftçi Bakou', 'Qarabağ FK'],
  MD: ['Milsami Orhei', 'Zimbru Chișinău', 'Petrocub Hîncești', 'Sheriff Tiraspol'],
  BY: ['Dinamo Minsk', 'Neman Grodno', 'Chakhtsyor Salihorsk', 'BATE Borisov'],
  CY: ['Doxa Katokopias', 'Ethnikos Achna', 'Omonia Nicosie', 'APOEL Nicosie', 'Apollon Limassol'],
  ME: ['OFK Petrovac', 'FK Sutjeska Nikšić', 'FK Budućnost Podgorica'],
  XK: ['FC Drita', 'KF Llapi', 'FC Ballkani', 'FC Prishtina'],
  BO: ['Nacional Potosí', 'Real Santa Cruz', 'The Strongest', 'Club Bolívar'],
  VE: ['Deportivo La Guaira', 'Estudiantes de Mérida', 'Deportivo Táchira', 'Caracas FC'],
  SV: ['Isidro Metapán', 'CD Águila', 'Alianza FC'],
  GT: ['Xelajú MC', 'Antigua GFC', 'Comunicaciones', 'Club Municipal'],
  TT: ['Point Fortin Civic', 'San Juan Jabloteh', 'Defence Force', 'W Connection'],
  HT: ['Racing Club Gonaïves', 'Tempête FC', 'Violette AC', 'Victory FC'],
  ZW: ['Chicken Inn FC', 'FC Platinum', 'Highlanders FC', 'Dynamos FC'],
  BW: ['Township Rollers', 'Gaborone United', 'Jwaneng Galaxy'],
  NA: ['Black Africa SC', 'African Stars', 'Tigers FC'],
  RW: ['AS Kigali', 'Rayon Sports', 'APR FC'],
  BJ: ['Buffles du Borgou', 'AS Police Cotonou', 'Dragons FC'],
  TG: ['AS Togo-Port', 'Gomido FC', 'ASKO Kara'],
  GA: ['FC 105 Libreville', 'US Bitam', 'CF Mounana'],
  CG: ['AC Léopards', 'CARA Brazzaville', 'Diables Noirs'],
  MG: ['AS Adema', 'CNaPS Sport', 'Fosa Juniors FC'],
  MU: ['Pamplemousses SC', 'Cercle de Joachim', 'Curepipe Starlight'],
  NP: ['Three Star Club', 'Machhindra FC', 'Manang Marshyangdi'],
  BD: ['Chittagong Abahani', 'Sheikh Russel KC', 'Bashundhara Kings', 'Abahani Limited'],
  KH: ['Preah Khan Reach', 'Visakha FC', 'Phnom Penh Crown'],
  MN: ['Erchim FC', 'Ulaanbaatar City', 'Khoromkhon FC'],
  CV: ['Sporting Praia', 'Boavista FC (Praia)', 'CD Travadores'],

  // ---- Tier D ----
  SM: ['SP Tre Fiori', 'SP La Fiorita', 'SS Folgore/Falciano', 'SS Pennarossa', 'AC Libertas', 'SC Cosmos', 'SS Virtus', 'SS Faetano', 'SP Domagnano', 'SS Murata', 'SS San Giovanni', 'FC Fiorentino', 'ASD Cailungo', 'Juvenes/Dogana'],
  AD: ['FC Santa Coloma', 'UE Santa Coloma', "Inter Club d'Escaldes", 'UE Sant Julià', 'FC Ordino', "Atlètic Club d'Escaldes", 'Penya Encarnada', 'Iberians FC', 'UE Extremenya', 'CE Carroi'],
  LI: ['FC Vaduz', 'USV Eschen/Mauren', 'FC Balzers', 'FC Triesen', 'FC Ruggell', 'FC Schaan', 'FC Triesenberg', 'FC Bendern'],
  GI: ['Lincoln Red Imps FC', "St Joseph's FC", 'Europa FC', 'Glacis United', 'Lynx FC', 'Manchester 62 FC', 'College 1975 FC', "Bruno's Magpies"],
  FO: ['KÍ Klaksvík', 'HB Tórshavn', 'B36 Tórshavn', 'NSÍ Runavík', 'EB/Streymur', 'Víkingur Gøta', 'ÍF Fuglafjørður', 'Skala ÍF'],
  MT: ['Valletta FC', 'Floriana FC', 'Hibernians FC', 'Sliema Wanderers', 'Birkirkara FC', 'Ħamrun Spartans', 'Balzan FC', 'Gżira United', 'Mosta FC'],
  LU: ['F91 Dudelange', 'Fola Esch', 'Jeunesse Esch', 'Progrès Niederkorn', 'Racing FC Union Luxembourg', 'Swift Hesperange', 'Differdange 03', 'US Hostert'],
  BT: ['Thimphu City FC', 'Paro FC', 'Transport United', 'Druk Pol FC'],
  BN: ['DPMM FC', 'Kasuka FC', 'Indera SC'],
  KM: ['Volcan Club', 'Coin Nord', 'Ngazi Sport', 'Foudre 2000'],
  SZ: ['Mbabane Highlanders', 'Green Mamba FC', 'Royal Leopards'],
  LS: ['Lioli FC', 'Matlama FC', 'Bantu FC'],
  SC: ['St Michel United', 'Anse Réunion', 'Foresters FC'],
  ST: ['Vitória FC', 'Sporting Praia Cruz', 'Os Operários'],
  TL: ['Karketu Dili', 'AS Boavida', 'DIT FC'],
  AS: ['Pago Youth', 'Vaiala Tomcats', 'Utulei Youth'],
  CK: ['Nikao Sokattak', 'Tupapa Maraerenga', 'Titikaveka FC'],
  AI: ['Kicks United', 'Roaring Lions', 'Uprising FC'],
  DJ: ['Arta/Solar7', 'Djibouti Télécom', 'AS Port'],
  SO: ['Jeenyo SC', 'Horseed FC', 'Elman FC'],
};

const GENERIC_FALLBACK = ['Club omnisport local', 'Union sportive municipale', 'Association athlétique'];

function clubListFor(countryCode: string): string[] {
  return REAL_CLUBS[countryCode] ?? GENERIC_FALLBACK;
}

// Choisit une fenêtre de la liste (triée du plus modeste au plus prestigieux) centrée sur
// le palier de prestige demandé (0 = amateur ... 5 = élite mondiale), pour rester cohérent
// avec le niveau de l'offre tout en gardant un peu de variété.
export function clubsForTier(countryCode: string, tierIndex: number): string[] {
  const list = clubListFor(countryCode);
  const n = list.length;
  if (n === 0) return GENERIC_FALLBACK;
  const fraction = clampFraction(tierIndex / 5);
  const centerIdx = Math.round(fraction * (n - 1));
  const radius = Math.max(1, Math.round(n / 5));
  const start = Math.max(0, centerIdx - radius);
  const end = Math.min(n, centerIdx + radius + 1);
  const window = list.slice(start, end);
  return window.length > 0 ? window : list;
}

function clampFraction(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function pickRealClub(countryCode: string, tierIndex: number, rng: Rng, avoid: string[] = []): string {
  const pool = clubsForTier(countryCode, tierIndex);
  const fresh = pool.filter((c) => !avoid.includes(c));
  return pick(rng, fresh.length > 0 ? fresh : pool);
}
