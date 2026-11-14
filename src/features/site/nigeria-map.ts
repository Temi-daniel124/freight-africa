// A stylised map of Nigeria for the routes section. Points are [longitude, latitude], projected onto a
// 480 x 380 box. The outline is simplified on purpose; it is a picture, not a survey map.
export const MAP_WIDTH = 480;
export const MAP_HEIGHT = 380;

const project = ([lon, lat]: readonly [number, number]) => [((lon - 2.6) * 40).toFixed(1), ((14 - lat) * 40).toFixed(1)].join(" ");

const outline: [number, number][] = [
  [2.7, 6.4], [3.4, 6.4], [4.5, 6.2], [5.0, 5.8], [5.4, 5.2], [6.0, 4.3], [7.0, 4.4], [8.3, 4.6], [8.6, 4.8],
  [8.9, 5.9], [9.6, 6.5], [11.0, 6.8], [11.8, 7.2], [12.2, 8.4], [13.2, 9.5], [13.6, 10.6], [14.6, 11.5],
  [14.2, 12.4], [13.6, 13.7], [12.2, 13.1], [10.5, 13.3], [8.0, 13.2], [6.8, 13.1], [5.5, 13.9], [4.1, 13.5],
  [3.6, 11.7], [3.6, 10.2], [2.8, 9.0],
];

export const outlinePath = `M ${outline.map(project).join(" L ")} Z`;

export const cities = {
  lagos: { name: "Lagos", at: [3.39, 6.45] },
  ibadan: { name: "Ibadan", at: [3.9, 7.38] },
  ilorin: { name: "Ilorin", at: [4.55, 8.5] },
  kaduna: { name: "Kaduna", at: [7.44, 10.52] },
  kano: { name: "Kano", at: [8.52, 12.0] },
  benin: { name: "Benin City", at: [5.62, 6.34] },
  lokoja: { name: "Lokoja", at: [6.74, 7.8] },
  abuja: { name: "Abuja", at: [7.49, 9.06] },
  onitsha: { name: "Onitsha", at: [6.79, 6.15] },
  enugu: { name: "Enugu", at: [7.5, 6.45] },
  aba: { name: "Aba", at: [7.37, 5.11] },
  portHarcourt: { name: "Port Harcourt", at: [7.0, 4.82] },
} as const;

type CityKey = keyof typeof cities;

const via = (...keys: CityKey[]) => `M ${keys.map((key) => project(cities[key].at)).join(" L ")}`;

export const corridorPaths: Record<string, string> = {
  "lagos-kano": via("lagos", "ibadan", "ilorin", "kaduna", "kano"),
  "lagos-abuja": via("lagos", "benin", "lokoja", "abuja"),
  "lagos-onitsha-aba": via("lagos", "benin", "onitsha", "aba"),
  "eastern-loop": via("portHarcourt", "aba", "onitsha", "enugu"),
};

// Cities that get a label on the map.
export const labelled: { key: CityKey; dx: number; dy: number; anchor: "start" | "end" }[] = [
  { key: "lagos", dx: -8, dy: 4, anchor: "end" },
  { key: "kano", dx: 10, dy: 4, anchor: "start" },
  { key: "abuja", dx: 10, dy: 4, anchor: "start" },
  { key: "onitsha", dx: -6, dy: 22, anchor: "end" },
  { key: "enugu", dx: 10, dy: 0, anchor: "start" },
  { key: "aba", dx: 10, dy: 6, anchor: "start" },
  { key: "portHarcourt", dx: -8, dy: 12, anchor: "end" },
];

export const point = (key: CityKey) => project(cities[key].at).split(" ").map(Number) as [number, number];
