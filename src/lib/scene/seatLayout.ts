export interface SeatTransform {
  position: [number, number, number];
  rotationY: number;
}

const TABLE_RADIUS = 3.2;

export function seatTransform(seat: number, totalSeats: number): SeatTransform {
  const angle = (seat / totalSeats) * Math.PI * 2;
  const x = Math.sin(angle) * TABLE_RADIUS;
  const z = Math.cos(angle) * TABLE_RADIUS;
  const rotationY = angle + Math.PI;
  return { position: [x, 0, z], rotationY };
}
