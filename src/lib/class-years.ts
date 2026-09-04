/**
 * Vienintelis klasių sąrašo šaltinis. Registracija ir mokyklos administratoriaus
 * klasių priskyrimas privalo naudoti TAS PAČIAS reikšmes — kitaip filtras
 * (profiles.assigned_classes vs profiles.class_year) niekada nesutampa ir
 * skydelis rodo tuščias lenteles.
 */
export const CLASS_YEARS = [
  "5",
  "6",
  "7",
  "8",
  "9 / I gimn.",
  "10 / II gimn.",
  "11 / III gimn.",
  "12 / IV gimn.",
] as const;

export type ClassYear = (typeof CLASS_YEARS)[number];
