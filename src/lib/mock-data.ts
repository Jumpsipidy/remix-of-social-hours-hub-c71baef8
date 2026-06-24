export type Organization = {
  id: string;
  name: string;
  category: string;
  town: string;
  description: string;
  spotsLeft: number;
  totalVolunteers: number;
  rating: number;
  hoursOffered: number;
  emoji: string;
};

export const organizations: Organization[] = [
  { id: »o1», name: »Vilniaus gyvūnų globos namai», category: »Gyvūnai», town: »Vilnius», description: »Pagalba prižiūrint benamius gyvūnus, pasivaikščiojimai ir socializacija.», spotsLeft: 8, totalVolunteers: 142, rating: 4.9, hoursOffered: 4, emoji: »🐾» },
  { id: »o2», name: »Maisto bankas», category: »Socialinė pagalba», town: »Kaunas», description: »Maisto rūšiavimas, pakavimas ir dalinimas šeimoms, kurioms reikia pagalbos.», spotsLeft: 12, totalVolunteers: 320, rating: 4.8, hoursOffered: 6, emoji: »🥫» },
  { id: »o3», name: »Senjorų dienos centras «Viltis»», category: »Senjorai», town: »Klaipėda», description: »Bendravimas su senjorais, knygų skaitymas, pagalba kasdienėje veikloje.», spotsLeft: 3, totalVolunteers: 84, rating: 5.0, hoursOffered: 3, emoji: »👵» },
  { id: »o4», name: »Žaliasis Vilnius», category: »Aplinkosauga», town: »Vilnius», description: »Parkų tvarkymo akcijos, medžių sodinimas ir aplinkos švietimo projektai.», spotsLeft: 25, totalVolunteers: 510, rating: 4.7, hoursOffered: 5, emoji: »🌳» },
  { id: »o5», name: »Vaikų svajonės», category: »Vaikai», town: »Šiauliai», description: »Užsiėmimų organizavimas vaikų globos namuose, kūrybinės dirbtuvės.», spotsLeft: 6, totalVolunteers: 96, rating: 4.9, hoursOffered: 4, emoji: »🎨» },
  { id: »o6», name: »Raudonojo Kryžiaus skyrius», category: »Sveikata», town: »Panevėžys», description: »Pirmosios pagalbos mokymai, kraujo donorystės akcijų organizavimas.», spotsLeft: 10, totalVolunteers: 230, rating: 4.8, hoursOffered: 5, emoji: »❤️» },
  { id: »o7», name: »Biblioteka «Knygnešys»», category: »Kultūra», town: »Kaunas», description: »Pagalba bibliotekoje: knygų katalogavimas, skaitymo vakarai vaikams.», spotsLeft: 4, totalVolunteers: 58, rating: 4.6, hoursOffered: 3, emoji: »📚» },
  { id: »o8», name: »Sporto klubas «Atletas»», category: »Sportas», town: »Vilnius», description: »Pagalba organizuojant vaikų sporto varžybas ir treniruotes.», spotsLeft: 15, totalVolunteers: 175, rating: 4.7, hoursOffered: 4, emoji: »⚽» },
  { id: »o9», name: »Pajūrio švara», category: »Aplinkosauga», town: »Klaipėda», description: »Paplūdimių valymo akcijos ir jūros ekosistemos švietimas.», spotsLeft: 30, totalVolunteers: 412, rating: 4.9, hoursOffered: 6, emoji: »🌊» },
];

export const towns = [»Visi miestai», »Vilnius», »Kaunas», »Klaipėda», »Šiauliai», »Panevėžys»];

export const studentStats = {
  completed: 42,
  required: 60,
  upcoming: 3,
  organizations: 4,
};

export const upcomingReservations = [
  { id: »r1», org: »Vilniaus gyvūnų globos namai», date: »Birželio 28 d., 10:00», hours: 4, status: »Patvirtinta» },
  { id: »r2», org: »Žaliasis Vilnius», date: »Liepos 2 d., 09:00», hours: 5, status: »Laukia patvirtinimo» },
  { id: »r3», org: »Maisto bankas», date: »Liepos 5 d., 14:00», hours: 6, status: »Patvirtinta» },
];

export const recentActivity = [
  { id: »a1», org: »Senjorų centras «Viltis»», date: »Birželio 18 d.», hours: 3, type: »Užbaigta» },
  { id: »a2», org: »Vaikų svajonės», date: »Birželio 14 d.», hours: 4, type: »Užbaigta» },
  { id: »a3», org: »Maisto bankas», date: »Birželio 10 d.», hours: 6, type: »Užbaigta» },
  { id: »a4», org: »Žaliasis Vilnius», date: »Birželio 5 d.», hours: 5, type: »Užbaigta» },
];

export const pendingRequests = [
  { id: »p1», student: »Emilija Kazlauskaitė», school: »Vilniaus Žemynos gimnazija», date: »Liepos 2 d., 09:00», hours: 5 },
  { id: »p2», student: »Lukas Petrauskas», school: »KTU gimnazija», date: »Liepos 3 d., 10:00», hours: 4 },
  { id: »p3», student: »Gabija Jonaitytė», school: »Vilniaus licėjus», date: »Liepos 4 d., 14:00», hours: 6 },
  { id: »p4», student: »Matas Stankus», school: »Šiaulių Didždvario gimnazija», date: »Liepos 6 d., 11:00», hours: 3 },
];

export const orgStats = {
  pending: 4,
  approvedMonth: 28,
  hoursDelivered: 624,
  activeVolunteers: 87,
};

export const completedVolunteers = [
  { id: »c1», student: »Augustė Vaitkutė», date: »Birželio 20 d.», hours: 4, rating: 5 },
  { id: »c2», student: »Tomas Žukauskas», date: »Birželio 19 d.», hours: 6, rating: 5 },
  { id: »c3», student: »Ieva Mockutė», date: »Birželio 17 d.», hours: 3, rating: 4 },
  { id: »c4», student: »Dominykas Urbonas», date: »Birželio 15 d.», hours: 5, rating: 5 },
  { id: »c5», student: »Karolina Balčiūnaitė», date: »Birželio 12 d.», hours: 4, rating: 5 },
];
