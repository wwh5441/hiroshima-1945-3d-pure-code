// Unified Terrain Mode Registry, Loader & Bilinear Elevation Sampler
// Supports 3 modes: "original" (304KB SRTM), "compact" (128x128 zlib ~48KB), and "math" (pure formula ~3KB).
import { getHiroshimaDemArrays } from "../../data/hiroshima-dem-1945.js";
import { getCompactDemArrays } from "../../data/hiroshima-dem-compact.js";
import { getMathDemArrays } from "../../data/hiroshima-dem-math.js";

export const TERRAIN_MODES = [
  { id: "original", shortLabel: "原版304K", label: "原版卫星 DEM (256/224, 304KB)" },
  { id: "compact", shortLabel: "精简48K", label: "精简卫星 DEM (128x128+zlib, 48KB)" },
  { id: "math", shortLabel: "纯公式3K", label: "纯数学公式地形 (零卫星数据, 3KB)" },
];

export const DEFAULT_TERRAIN_MODE = "original";

export function isValidTerrainMode(modeId) {
  return TERRAIN_MODES.some((m) => m.id === modeId);
}

export async function loadTerrainDem(modeId = DEFAULT_TERRAIN_MODE) {
  if (modeId === "compact") return getCompactDemArrays();
  if (modeId === "math") return getMathDemArrays();
  return getHiroshimaDemArrays();
}

function bilerpGrid(grid, x, z) {
  const { data, size, halfSpanM } = grid;
  const u = (x + halfSpanM) / (2.0 * halfSpanM);
  const v = (z + halfSpanM) / (2.0 * halfSpanM);
  if (u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0) return null;
  const fx = u * (size - 1);
  const fz = v * (size - 1);
  const x0 = Math.min(size - 2, Math.max(0, Math.floor(fx)));
  const z0 = Math.min(size - 2, Math.max(0, Math.floor(fz)));
  const tx = fx - x0;
  const tz = fz - z0;
  const i00 = z0 * size + x0;
  const v0 = data[i00] * (1.0 - tx) + data[i00 + 1] * tx;
  const v1 = data[i00 + size] * (1.0 - tx) + data[i00 + size + 1] * tx;
  return v0 * (1.0 - tz) + v1 * tz;
}

export function sampleDemElevation(demArrays, x, z) {
  const { regional, urban } = demArrays;
  const urbHalf = urban.halfSpanM;
  const maxAbs = Math.max(Math.abs(x), Math.abs(z));
  if (maxAbs < urbHalf - 450.0) {
    return bilerpGrid(urban, x, z) ?? 0.0;
  }
  const hReg = bilerpGrid(regional, x, z) ?? 0.0;
  if (maxAbs < urbHalf) {
    const hUrb = bilerpGrid(urban, x, z) ?? hReg;
    const w = (urbHalf - maxAbs) / 450.0;
    return hReg * (1.0 - w) + hUrb * w;
  }
  return hReg;
}

export function sampleDemSlopeDeg(demArrays, x, z) {
  const eps = 35.0;
  const hx = (sampleDemElevation(demArrays, x + eps, z) - sampleDemElevation(demArrays, x - eps, z)) / (2.0 * eps);
  const hz = (sampleDemElevation(demArrays, x, z + eps) - sampleDemElevation(demArrays, x, z - eps)) / (2.0 * eps);
  return Math.atan(Math.hypot(hx, hz)) * (180.0 / Math.PI);
}
