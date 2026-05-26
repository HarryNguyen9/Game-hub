export const FLEET_CONFIG = {
  boardSize: 8,
  fleetSize: 4,
  shipCatalog: [
    { id: "patrol-line-2", label: "Patrol", size: 2, shape: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
    { id: "scout-line-3", label: "Scout", size: 3, shape: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }] },
    { id: "cutter-corner-3", label: "Cutter", size: 3, shape: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }] },
    { id: "barge-square-4", label: "Barge", size: 4, shape: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
    { id: "hook-4", label: "Hook", size: 4, shape: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }] },
    { id: "zigzag-4", label: "Zigzag", size: 4, shape: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }] }
  ]
} as const;
