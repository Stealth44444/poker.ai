export interface SeatTransform {
  position: [number, number, number];
  rotationY: number;
}

// Table.tsx renders leonard-garcia-table.glb at scale 0.75 with rotationY = PI/2.
// The model's raw bbox is x:[2.926, 7.916] z:[6.989, 9.054], so after scale + the
// 90-degree rotation (which swaps local x/z into world z/x) the felt's world-space
// half-extents are x=0.774, z=1.871 — a long oval, not a circle. Seats are placed on
// an ellipse matching that footprint, offset outward by SEAT_MARGIN so chairs/avatars
// clear the table edge instead of overlapping or floating far away from it.
const TABLE_HALF_X = 0.774;
const TABLE_HALF_Z = 1.871;
const SEAT_MARGIN = 0.6;
const RADIUS_X = TABLE_HALF_X + SEAT_MARGIN;
const RADIUS_Z = TABLE_HALF_Z + SEAT_MARGIN;

export function seatTransform(seat: number, totalSeats: number): SeatTransform {
  const angle = (seat / totalSeats) * Math.PI * 2;
  const x = Math.sin(angle) * RADIUS_X;
  const z = Math.cos(angle) * RADIUS_Z;
  const rotationY = angle + Math.PI;
  return { position: [x, 0, z], rotationY };
}
