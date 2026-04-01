// ===================== SHARED CONSTANTS =====================

export const ALGOS = [
  { id: "astar",    label: "A* Search", short: "A*",       icon: "✦", color: "#2563eb" },
  { id: "dijkstra", label: "Dijkstra",  short: "Dijkstra", icon: "◈", color: "#7c3aed" },
  { id: "bfs",      label: "BFS",       short: "BFS",      icon: "◎", color: "#059669" },
  { id: "dfs",      label: "DFS",       short: "DFS",      icon: "◇", color: "#d97706" },
];

export const CELL_EMPTY = 0;
export const CELL_WALL  = 1;

export const DRAW_MODES = [
  { id: "wall",  label: "Wall",        icon: "▪", color: "#dc2626" },
  { id: "start", label: "Source Node", icon: "▶", color: "#16a34a" },
  { id: "end",   label: "Target Node", icon: "◼", color: "#d97706" },
];

export const LEGEND_ITEMS = [
  ["#16a34a", "Source"],
  ["#d97706", "Target"],
  ["#1f2937", "Wall"],
  ["#c4b5fd", "Visited"],
  ["#93c5fd", "Frontier"],
  ["#2563eb", "Path"],
];