export const FLEET_CONFIG = {
  boardSize: 8,
  ships: [
    { id: "carrier", size: 4 },
    { id: "cruiser", size: 3 },
    { id: "patrol-a", size: 2 },
    { id: "patrol-b", size: 2 }
  ]
} as const;
