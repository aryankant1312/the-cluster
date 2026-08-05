/** Equirectangular projection: lon/lat in degrees -> [x, y] in a 0-1000 x 0-500 viewBox. */
export function project([lon, lat]: [number, number]): [number, number] {
  const x = ((lon + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return [x, y];
}
