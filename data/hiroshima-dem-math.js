// Pure-Math Procedural Hiroshima 1945 Terrain Generator (~3 KB, zero satellite DEM data).
// Models the 1945 Hiroshima Bay coastline, Ota Delta plain, Chugoku mountain amphitheater,
// named hills & Seto Inland Sea islands strictly from mathematical formulas + HIROSHIMA_GEO.
import { HIROSHIMA_GEO } from "./hiroshima-geo.js";

const REGIONAL_N = 256;
const REGIONAL_HALF_M = 30000.0;
const URBAN_N = 224;
const URBAN_HALF_M = 6500.0;

function hash2(ix, iz) {
  const n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uz = fz * fz * (3.0 - 2.0 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return (a + (b - a) * ux) + ((c + (d - c) * ux) - (a + (b - a) * ux)) * uz;
}

function ridgeFbm(x, z, octaves = 4) {
  let sum = 0.0, amp = 0.55, freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    const r = 1.0 - Math.abs(vnoise(x * freq, z * freq) * 2.0 - 1.0);
    sum += amp * r * r;
    x = x * 2.03 + 11.7;
    z = z * 2.03 - 7.3;
    amp *= 0.48;
  }
  return sum;
}

function coastLimitZ(x) {
  // 1945 wartime shoreline: Ota delta coast (~z=2850..3150), Ujina spit (x~960),
  // western Hatsukaichi bay curving north (z~1150..1800) & eastern Kaita bay (z~2100)
  const westBay = 1650.0 / (1.0 + Math.exp((x + 2650.0) / 480.0));
  const eastBay = 780.0 / (1.0 + Math.exp(-(x - 2750.0) / 520.0));
  const ripple = 180.0 * Math.sin(x * 0.00075) + 90.0 * Math.cos(x * 0.0019);
  const ujinaSpit = 940.0 * Math.exp(-Math.pow((x - 960.0) / 640.0, 2.0));
  const ebaFinger = 380.0 * Math.exp(-Math.pow((x + 1750.0) / 520.0, 2.0));
  return HIROSHIMA_GEO.coastlineSouthZ + 220.0 - westBay - eastBay + ripple + ujinaSpit + ebaFinger;
}

export function evaluateMathElevation(x, z) {
  const sampleShapes = (list) => {
    let h = 0.0;
    for (const s of list) {
      const dx = (x - s.cx) / s.rx;
      const dz = (z - s.cz) / s.rz;
      const r2 = dx * dx + dz * dz;
      if (r2 < 5.5) {
        const ridge = 0.72 + 0.48 * ridgeFbm(x * 0.00075 + s.cx * 0.001, z * 0.00075, 3);
        h = Math.max(h, s.h * Math.exp(-r2 * 1.15) * ridge);
      }
    }
    return h;
  };

  // 1. Islands in Hiroshima Bay vs mainland hills
  const islandH = sampleShapes(HIROSHIMA_GEO.islands);
  const zCoast = coastLimitZ(x);
  if (z > zCoast) {
    return islandH > 2.2 ? islandH : 0.0;
  }

  const featureH = Math.max(islandH, sampleShapes(HIROSHIMA_GEO.mountains));

  // 3. Ota Delta alluvial plain (1.8m..6m) + northern valley slope
  const inland = zCoast - z;
  const valleyCorridor = Math.exp(-Math.pow((x + 420.0 - z * 0.1) / 1450.0, 2.0));
  const eastRailCorridor = Math.exp(-Math.pow((z + 350.0) / 1100.0, 2.0)) * (x > 0 ? 0.75 : 0.45);
  const plainElev = Math.min(18.0, 1.8 + inland * 0.0012);

  // 4. Chugoku Mountain Amphitheater framing North, West, and East
  const distCore = Math.hypot(x * 0.78, Math.min(0, z + 350) * 1.0 + Math.max(0, -z - 1800) * 0.45);
  const ringMask = Math.max(0.0, Math.min(1.0, (distCore - 3450.0) / 4200.0));
  const corridorCut = 1.0 - 0.76 * Math.max(valleyCorridor, eastRailCorridor);
  const mtnField = (160.0 + 620.0 * ridgeFbm(x * 0.00018, z * 0.00018, 4)) * ringMask * ringMask * corridorCut;

  return Math.max(plainElev, featureH, mtnField);
}

function bakeGrid(n, halfSpanM) {
  const data = new Float32Array(n * n);
  const step = (2.0 * halfSpanM) / (n - 1);
  for (let iz = 0; iz < n; iz++) {
    const z = -halfSpanM + iz * step;
    for (let ix = 0; ix < n; ix++) {
      const x = -halfSpanM + ix * step;
      data[iz * n + ix] = evaluateMathElevation(x, z);
    }
  }
  return { data, size: n, halfSpanM };
}

let _cached = null;

export function getMathDemArrays() {
  if (!_cached) {
    _cached = {
      regional: bakeGrid(REGIONAL_N, REGIONAL_HALF_M),
      urban: bakeGrid(URBAN_N, URBAN_HALF_M),
    };
  }
  return _cached;
}
