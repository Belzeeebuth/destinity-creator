export type Language = 'fr' | 'en';

const STORAGE_KEY = 'destiny11_language_v1';

export function loadLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // stockage indisponible : on ignore
  }
}

// Sélecteur générique fr/en pour les champs de données bilingues (positions, origines, agents,
// investissements...) consommé côté UI, où l'on a `language` (store) mais pas de `PlayerState`.
export function L(lang: Language, fr: string, en: string): string {
  return lang === 'en' ? en : fr;
}
