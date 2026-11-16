// Disposizioni del "Pavimento della Fabbrica".
// Ogni riga: { y, xs: [...], faceDown }. x è in mezze larghezze di carta (una carta è larga 2).
// La riga con y maggiore sta più in basso e si prende per prima.
// Una carta è coperta da ogni carta della riga successiva con |dx| <= 1.

const SHAPES = {
  // Epoca I – "Nastro": una tramoggia che si stringe verso il basso.
  1: [
    { xs: [0, 2, 4, 6, 8, 10], faceDown: false },
    { xs: [1, 3, 5, 7, 9], faceDown: true },
    { xs: [2, 4, 6, 8], faceDown: false },
    { xs: [3, 5, 7], faceDown: false },
  ],
  // Epoca II – "Ingranaggio": un rombo.
  2: [
    { xs: [3, 5, 7], faceDown: false },
    { xs: [2, 4, 6, 8], faceDown: true },
    { xs: [1, 3, 5, 7, 9], faceDown: false },
    { xs: [2, 4, 6, 8], faceDown: true },
    { xs: [3, 7], faceDown: false },
  ],
  // Epoca III – "Ciminiera": una torre su una base larga.
  3: [
    { xs: [4, 6], faceDown: false },
    { xs: [3, 5, 7], faceDown: true },
    { xs: [4, 6], faceDown: false },
    { xs: [3, 5, 7], faceDown: true },
    { xs: [2, 4, 6, 8], faceDown: false },
    { xs: [1, 3, 7, 9], faceDown: false },
  ],
};

export function buildLayout(age) {
  const rows = SHAPES[age];
  const slots = [];
  rows.forEach((row, y) => {
    row.xs.forEach((x) => slots.push({ x, y, faceDown: row.faceDown }));
  });
  slots.forEach((s, i) => {
    s.index = i;
    s.coveredBy = slots
      .map((o, j) => (o.y === s.y + 1 && Math.abs(o.x - s.x) <= 1 ? j : -1))
      .filter((j) => j >= 0);
  });
  return slots;
}

export function layoutSize(age) {
  return SHAPES[age].reduce((n, r) => n + r.xs.length, 0);
}
