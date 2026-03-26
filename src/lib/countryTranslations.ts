// Country name translations - keyed by Arabic name (DB storage format)
export const countryTranslations: Record<string, Record<string, string>> = {
  "المغرب": { ar: "المغرب", en: "Morocco", fr: "Maroc", es: "Marruecos" },
  "الجزائر": { ar: "الجزائر", en: "Algeria", fr: "Algérie", es: "Argelia" },
  "تونس": { ar: "تونس", en: "Tunisia", fr: "Tunisie", es: "Túnez" },
  "ليبيا": { ar: "ليبيا", en: "Libya", fr: "Libye", es: "Libia" },
  "مصر": { ar: "مصر", en: "Egypt", fr: "Égypte", es: "Egipto" },
  "موريتانيا": { ar: "موريتانيا", en: "Mauritania", fr: "Mauritanie", es: "Mauritania" },
  "السعودية": { ar: "السعودية", en: "Saudi Arabia", fr: "Arabie Saoudite", es: "Arabia Saudita" },
  "الإمارات": { ar: "الإمارات", en: "UAE", fr: "Émirats Arabes Unis", es: "Emiratos Árabes" },
  "الكويت": { ar: "الكويت", en: "Kuwait", fr: "Koweït", es: "Kuwait" },
  "قطر": { ar: "قطر", en: "Qatar", fr: "Qatar", es: "Catar" },
  "البحرين": { ar: "البحرين", en: "Bahrain", fr: "Bahreïn", es: "Baréin" },
  "عُمان": { ar: "عُمان", en: "Oman", fr: "Oman", es: "Omán" },
  "الأردن": { ar: "الأردن", en: "Jordan", fr: "Jordanie", es: "Jordania" },
  "لبنان": { ar: "لبنان", en: "Lebanon", fr: "Liban", es: "Líbano" },
  "العراق": { ar: "العراق", en: "Iraq", fr: "Irak", es: "Irak" },
  "سوريا": { ar: "سوريا", en: "Syria", fr: "Syrie", es: "Siria" },
  "فلسطين": { ar: "فلسطين", en: "Palestine", fr: "Palestine", es: "Palestina" },
  "اليمن": { ar: "اليمن", en: "Yemen", fr: "Yémen", es: "Yemen" },
  "السودان": { ar: "السودان", en: "Sudan", fr: "Soudan", es: "Sudán" },
  "تركيا": { ar: "تركيا", en: "Turkey", fr: "Turquie", es: "Turquía" },
  "فرنسا": { ar: "فرنسا", en: "France", fr: "France", es: "Francia" },
  "إسبانيا": { ar: "إسبانيا", en: "Spain", fr: "Espagne", es: "España" },
  "بلجيكا": { ar: "بلجيكا", en: "Belgium", fr: "Belgique", es: "Bélgica" },
  "هولندا": { ar: "هولندا", en: "Netherlands", fr: "Pays-Bas", es: "Países Bajos" },
  "ألمانيا": { ar: "ألمانيا", en: "Germany", fr: "Allemagne", es: "Alemania" },
  "إيطاليا": { ar: "إيطاليا", en: "Italy", fr: "Italie", es: "Italia" },
  "كندا": { ar: "كندا", en: "Canada", fr: "Canada", es: "Canadá" },
  "الولايات المتحدة": { ar: "الولايات المتحدة", en: "United States", fr: "États-Unis", es: "Estados Unidos" },
  "بريطانيا": { ar: "بريطانيا", en: "United Kingdom", fr: "Royaume-Uni", es: "Reino Unido" },
};

export function translateCountry(arabicName: string, locale: string): string {
  const t = countryTranslations[arabicName];
  if (!t) return arabicName;
  return t[locale] || t["ar"] || arabicName;
}
