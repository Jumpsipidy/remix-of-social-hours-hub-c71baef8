type ReservationState = {
  source?: string | null;
  requires_checkin?: boolean | null;
  status: string;
};

export function isSchoolReservation(reservation: ReservationState) {
  return reservation.source === "school";
}

export function isActiveStudentReservation(reservation: ReservationState) {
  return reservation.status === "pending" || reservation.status === "approved";
}

export function studentReservationNeedsQr(reservation: ReservationState) {
  return !isSchoolReservation(reservation) && reservation.requires_checkin !== false && reservation.status === "approved";
}

export function studentReservationStatus(reservation: ReservationState) {
  if (reservation.status === "completed" || reservation.status === "confirmed") return "Užbaigta";
  if (reservation.status === "declined") return "Atmesta";
  if (isSchoolReservation(reservation)) return "Suplanuota auklėtojo";
  return reservation.status === "approved" ? "Vykdoma" : "Laukia patvirtinimo";
}