// Auklėtojo sąsajos vedlio (tour) žingsniai ir būsena.
// Būsena saugoma tik naršyklėje (localStorage) — niekur neišsiunčiama.

export const TEACHER_TOUR_STORAGE_KEY = "sv_teacher_tour_v1";

export interface TeacherTourStep {
  id: string;
  /** CSS selektorius elemento, kurį reikia paryškinti, radimui. */
  selector: string;
  title: string;
  body: string;
}

export const TEACHER_TOUR_STEPS: readonly TeacherTourStep[] = [
  {
    id: "nav",
    selector: '[data-tour="nav"]',
    title: "Navigacija",
    body: "Čia persijungi tarp apžvalgos, mokinių sąrašo, rezervacijų ir pokalbių su organizacijomis.",
  },
  {
    id: "hero",
    selector: '[data-tour="hero"]',
    title: "Dienos santrauka",
    body: "Pasisveikinimas, šiandienos data ir tavo priskirtos klasės. Viskas svarbiausia — vienoje juostoje.",
  },
  {
    id: "quick-actions",
    selector: '[data-tour="quick-actions"]',
    title: "Greitieji veiksmai",
    body: "Vienu paspaudimu kurk rezervaciją, skelbk veiklą visai mokyklai arba rašyk organizacijai.",
  },
  {
    id: "kpis",
    selector: '[data-tour="kpis"]',
    title: "Svarbiausi skaičiai",
    body: "Mokinių skaičius, vidutinis progresas, surinktos valandos ir artėjančios rezervacijos — visada prieš akis.",
  },
  {
    id: "chart",
    selector: '[data-tour="chart"]',
    title: "Valandų dinamika",
    body: "Grafikas rodo, kiek valandų mokiniai surinko per pastaruosius 12 mėnesių. Matysi, ar tempas auga.",
  },
  {
    id: "class-hours",
    selector: '[data-tour="class-hours"]',
    title: "Klasių palyginimas",
    body: "Palygink, kaip sekasi kiekvienai tavo klasei — lengva pastebėti, kurioms reikia paskatos.",
  },
  {
    id: "upcoming",
    selector: '[data-tour="upcoming"]',
    title: "Artėjančios rezervacijos",
    body: "Visos patvirtintos mokyklos rezervacijos su datomis ir valandomis. Spustelėk — pateksi į pilną sąrašą.",
  },
  {
    id: "attention",
    selector: '[data-tour="attention"]',
    title: "Reikia dėmesio",
    body: "Mokiniai, kurių progresas mažesnis nei 35 %. Verta pakalbėti arba pasiūlyti papildomą veiklą.",
  },
  {
    id: "streaks",
    selector: '[data-tour="streaks"]',
    title: "Streak lyderiai",
    body: "Aktyviausi mokiniai pagal prisijungimų serijas. Geras būdas pastebėti ir pagirti stropiausius.",
  },
] as const;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function tourCompleted(storage: StorageLike | null = defaultStorage()): boolean {
  try {
    return storage?.getItem(TEACHER_TOUR_STORAGE_KEY) === "done";
  } catch {
    return false;
  }
}

export function markTourCompleted(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(TEACHER_TOUR_STORAGE_KEY, "done");
  } catch {
    // Sugedusi naršyklės atmintis neturi blokuoti vedlio.
  }
}

export function resetTour(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(TEACHER_TOUR_STORAGE_KEY, "");
  } catch {
    // Ignoruojama — vedlys tiesiog pasirodys dar kartą.
  }
}
