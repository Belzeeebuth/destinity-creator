// Générateur de noms (joueur et personnages secondaires) selon la zone culturelle du pays choisi.
type NamePool = { first: string[]; last: string[] };

const POOLS: Record<string, NamePool> = {
  bresil: {
    first: ['Gabriel', 'Lucas', 'Matheus', 'Rafael', 'Bruno', 'Thiago', 'Vinícius', 'Caio', 'Everton', 'Kaique'],
    last: ['Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Nascimento', 'Carvalho'],
  },
  francophone: {
    first: ['Lucas', 'Hugo', 'Nathan', 'Adam', 'Léo', 'Louis', 'Enzo', 'Malo', 'Younes', 'Amir'],
    last: ['Bernard', 'Dubois', 'Moreau', 'Girard', 'Fontaine', 'Rousseau', 'Lefevre', 'Mendy', 'Traoré', 'Diakité'],
  },
  iberique: {
    first: ['Diego', 'Pablo', 'Iker', 'Rodrigo', 'Bruno', 'Tiago', 'Álvaro', 'Nuno', 'Gonzalo', 'Mateo'],
    last: ['García', 'Fernández', 'López', 'Martins', 'Silva', 'Ferreira', 'Costa', 'Rodrigues', 'Pereira', 'Domínguez'],
  },
  hispano_americain: {
    first: ['Santiago', 'Mateo', 'Nicolás', 'Emiliano', 'Joaquín', 'Agustín', 'Franco', 'Bruno', 'Ezequiel', 'Facundo'],
    last: ['González', 'Rodríguez', 'Martínez', 'Gómez', 'Díaz', 'Romero', 'Sosa', 'Acosta', 'Herrera', 'Benítez'],
  },
  anglophone: {
    first: ['Jack', 'Harry', 'Oliver', 'George', 'Charlie', 'Josh', 'Callum', 'Ethan', 'Marcus', 'Tyler'],
    last: ['Smith', 'Taylor', 'Johnson', 'Walker', 'Wright', 'Evans', 'Roberts', 'Turner', 'Hughes', 'Clarke'],
  },
  germano_nordique: {
    first: ['Lukas', 'Finn', 'Niklas', 'Erik', 'Anders', 'Magnus', 'Sven', 'Jonas', 'Felix', 'Mikael'],
    last: ['Müller', 'Schneider', 'Fischer', 'Andersen', 'Karlsson', 'Nilsson', 'Hansen', 'Weber', 'Becker', 'Larsen'],
  },
  balkans_est: {
    first: ['Luka', 'Marko', 'Nikola', 'Ivan', 'Andrei', 'Bogdan', 'Petar', 'Vlad', 'Milan', 'Stefan'],
    last: ['Petrović', 'Ivanović', 'Novak', 'Popescu', 'Dimitrov', 'Kovač', 'Horvat', 'Nagy', 'Kowalski', 'Nowak'],
  },
  afrique: {
    first: ['Kwame', 'Emeka', 'Sadio', 'Aliou', 'Moussa', 'Ibrahim', 'Yaya', 'Didier', 'Samuel', 'Victor'],
    last: ['Mensah', 'Okafor', 'Diop', 'Traoré', 'Keita', 'Camara', 'Adeyemi', 'Mwangi', 'Banda', 'Chukwu'],
  },
  moyen_orient: {
    first: ['Karim', 'Omar', 'Yassine', 'Khalid', 'Rami', 'Tarek', 'Amir', 'Hamza', 'Fahad', 'Sami'],
    last: ['Al-Sayed', 'Haddad', 'Mansour', 'Nasser', 'Farouk', 'Saleh', 'Aziz', 'Karam', 'Rahman', 'Osman'],
  },
  asie_est: {
    first: ['Haruto', 'Ren', 'Min-jun', 'Jae-won', 'Sora', 'Yuto', 'Wei', 'Jun', 'Hiro', 'Seok'],
    last: ['Tanaka', 'Suzuki', 'Kim', 'Park', 'Lee', 'Watanabe', 'Nakamura', 'Choi', 'Yamamoto', 'Sato'],
  },
  asie_sud: {
    first: ['Arjun', 'Rohan', 'Aditya', 'Karan', 'Farhan', 'Vikram', 'Sanjay', 'Rahul', 'Aryan', 'Dev'],
    last: ['Sharma', 'Patel', 'Kumar', 'Singh', 'Rahman', 'Gupta', 'Reddy', 'Chowdhury', 'Nair', 'Iqbal'],
  },
  oceanie: {
    first: ['Jack', 'Cooper', 'Riley', 'Mason', 'Liam', 'Noah', 'Ethan', 'Lachlan', 'Hunter', 'Blake'],
    last: ['Anderson', 'Thompson', 'White', 'Baker', 'Wilson', 'Mitchell', 'Campbell', 'Stewart', 'Fa’amoe', 'Tuilagi'],
  },
  caraibes: {
    first: ['Jamal', 'Andre', 'Kelvin', 'Dwayne', 'Marlon', 'Shane', 'Kevon', 'Trevon', 'Romario', 'Deshawn'],
    last: ['Campbell', 'Brown', 'Williams', 'James', 'Edwards', 'Grant', 'Bailey', 'Clarke', 'Morris', 'Reid'],
  },
};

const COUNTRY_TO_POOL: Record<string, keyof typeof POOLS> = {
  BR: 'bresil', CV: 'afrique',
  FR: 'francophone', BE: 'francophone', CH: 'francophone', ML: 'afrique', CI: 'afrique', SN: 'afrique',
  ES: 'iberique', PT: 'iberique',
  AR: 'hispano_americain', UY: 'hispano_americain', CO: 'hispano_americain', CL: 'hispano_americain',
  EC: 'hispano_americain', PE: 'hispano_americain', BO: 'hispano_americain', VE: 'hispano_americain',
  MX: 'hispano_americain', CR: 'hispano_americain', PA: 'hispano_americain', HN: 'hispano_americain',
  SV: 'hispano_americain', GT: 'hispano_americain',
  EN: 'anglophone', WA: 'anglophone', US: 'anglophone', CA: 'anglophone', IE: 'anglophone',
  DE: 'germano_nordique', NL: 'germano_nordique', AT: 'germano_nordique', DK: 'germano_nordique',
  SE: 'germano_nordique', NO: 'germano_nordique', FI: 'germano_nordique', IS: 'germano_nordique',
  LU: 'germano_nordique', LI: 'germano_nordique',
  HR: 'balkans_est', RS: 'balkans_est', BA: 'balkans_est', ME: 'balkans_est', MK: 'balkans_est',
  AL: 'balkans_est', XK: 'balkans_est', PL: 'balkans_est', RO: 'balkans_est', BG: 'balkans_est',
  UA: 'balkans_est', BY: 'balkans_est', MD: 'balkans_est', SK: 'balkans_est', SI: 'balkans_est',
  HU: 'balkans_est', CZ: 'balkans_est', GR: 'balkans_est', RU: 'balkans_est', EE: 'balkans_est',
  LV: 'balkans_est', LT: 'balkans_est', GE: 'balkans_est', AM: 'balkans_est', AZ: 'balkans_est',
  CY: 'balkans_est',
  MA: 'afrique', DZ: 'afrique', TN: 'afrique', NG: 'afrique', GH: 'afrique', CM: 'afrique',
  BF: 'afrique', CD: 'afrique', ZM: 'afrique', UG: 'afrique', KE: 'afrique', ZA: 'afrique',
  ZW: 'afrique', BW: 'afrique', NA: 'afrique', RW: 'afrique', BJ: 'afrique', TG: 'afrique',
  GA: 'afrique', CG: 'afrique', MG: 'afrique', MU: 'afrique', SZ: 'afrique', LS: 'afrique',
  SC: 'afrique', ST: 'afrique', KM: 'afrique', DJ: 'afrique', SO: 'afrique', EG: 'moyen_orient',
  IR: 'moyen_orient', SA: 'moyen_orient', QA: 'moyen_orient', AE: 'moyen_orient', TR: 'moyen_orient',
  IL: 'moyen_orient',
  JP: 'asie_est', KR: 'asie_est', CN: 'asie_est', MN: 'asie_est',
  IN: 'asie_sud', VN: 'asie_sud', TH: 'asie_sud', ID: 'asie_sud', BD: 'asie_sud', NP: 'asie_sud',
  KH: 'asie_sud', BN: 'asie_sud', BT: 'asie_sud', TL: 'asie_sud',
  AU: 'oceanie', NZ: 'oceanie', AS: 'oceanie', CK: 'oceanie',
  JM: 'caraibes', TT: 'caraibes', HT: 'caraibes', AI: 'caraibes',
  IT: 'iberique', SM: 'iberique', AD: 'iberique', GI: 'anglophone', MT: 'iberique', FO: 'germano_nordique',
};

export function poolForCountry(code: string): NamePool {
  const key = COUNTRY_TO_POOL[code] ?? 'francophone';
  return POOLS[key];
}

export function randomName(code: string, rng: () => number): { firstName: string; lastName: string } {
  const pool = poolForCountry(code);
  const firstName = pool.first[Math.floor(rng() * pool.first.length)];
  const lastName = pool.last[Math.floor(rng() * pool.last.length)];
  return { firstName, lastName };
}
