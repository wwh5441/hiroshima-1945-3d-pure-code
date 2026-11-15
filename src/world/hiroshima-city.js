import * as THREE from "../../vendor/three.module.js";
import { SKY_SCATTERING_GLSL } from "../atmosphere/sky-scattering.glsl.js";
import { HIROSHIMA_GEO } from "../../data/hiroshima-geo.js";
import { getHiroshimaDemArrays } from "../../data/hiroshima-dem-1945.js";
import { sampleDemElevation, sampleDemSlopeDeg } from "./terrain-modes.js";

// 1945 Hiroshima 3D Urban Architecture & Historical Landmarks Module
// - 11,500+ Instanced 3D Japanese pitched-roof kawara wooden houses & commercial blocks
// - Dedicated 3D Landmarks: Aioi "T" Bridge, A-Bomb Dome (with blast-strippable copper dome skin
//   exposing open skeletal steel ribs!), Shima Hospital [0,0], Hiroshima Castle & Moat, Fukuya RC Store,
//   Ujina Military Shipping Piers & 8 Ota River Bridges.
// - Real-time Mach-stem blast flattening & charring driven by uGroundWaveR!

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pointSegDist(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const len2 = vx * vx + vz * vz;
  const h = len2 > 1e-4 ? Math.max(0, Math.min(1, (wx * vx + wz * vz) / len2)) : 0;
  return Math.hypot(wx - vx * h, wz - vz * h);
}

function riverSignedDist(px, pz, geo) {
  let minD = 1e9;
  for (const r of geo.rivers) {
    const halfW = r.width * 0.5;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, az] = r.pts[i];
      const [bx, bz] = r.pts[i + 1];
      const d = pointSegDist(px, pz, ax, az, bx, bz) - halfW;
      if (d < minD) minD = d;
    }
  }
  return minD;
}

// Non-indexed 3D Japanese pitched-roof Machiya house prism (unit footprint 1x1x1, base at y=0, ridge at y=1.0)
// Vertex attribute aRoofFlag = 1.0 on dark kawara tile roof faces, 0.0 on cedar/plaster walls!
function createGabledHouseGeometry() {
  const pos = [];
  const nrm = [];
  const roofFlag = [];

  const pushTri = (ax, ay, az, bx, by, bz, cx, cy, cz, isRoof) => {
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    nrm.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    roofFlag.push(isRoof, isRoof, isRoof);
  };

  const pushQuad = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, isRoof) => {
    pushTri(ax, ay, az, bx, by, bz, cx, cy, cz, isRoof);
    pushTri(ax, ay, az, cx, cy, cz, dx, dy, dz, isRoof);
  };

  const hw = 0.5;
  const hd = 0.5;
  const eaveY = 0.64;
  const ridgeY = 1.0;
  const eaveOver = 0.56;

  // Front (-Z) & Back (+Z) walls
  pushQuad(-hw, 0, -hd, hw, 0, -hd, hw, eaveY, -hd, -hw, eaveY, -hd, 0.0);
  pushQuad(hw, 0, hd, -hw, 0, hd, -hw, eaveY, hd, hw, eaveY, hd, 0.0);
  // Left (-X) & Right (+X) walls + gable triangles
  pushQuad(-hw, 0, hd, -hw, 0, -hd, -hw, eaveY, -hd, -hw, eaveY, hd, 0.0);
  pushTri(-hw, eaveY, hd, -hw, eaveY, -hd, -hw, ridgeY, 0, 0.0);
  pushQuad(hw, 0, -hd, hw, 0, hd, hw, eaveY, hd, hw, eaveY, -hd, 0.0);
  pushTri(hw, eaveY, -hd, hw, eaveY, hd, hw, ridgeY, 0, 0.0);

  // Overhanging pitched kawara tile roof slopes (-Z slope & +Z slope)
  pushQuad(-eaveOver, eaveY, -eaveOver, eaveOver, eaveY, -eaveOver, eaveOver, ridgeY, 0, -eaveOver, ridgeY, 0, 1.0);
  pushQuad(eaveOver, eaveY, eaveOver, -eaveOver, eaveY, eaveOver, -eaveOver, ridgeY, 0, eaveOver, ridgeY, 0, 1.0);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geom.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  geom.setAttribute("aRoofFlag", new THREE.Float32BufferAttribute(roofFlag, 1));
  return geom;
}

// Helper to append procedural landmark sub-meshes into a single merged BufferGeometry for 1-draw-call speed!
class LandmarkBuilder {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.colors = [];
    this.metas = []; // vec4(anchorX, anchorZ, resist, isScorchable)
  }

  addGeometry(geom, matrix, colorHex, anchorX, anchorZ, resist) {
    const g = geom.index ? geom.toNonIndexed() : geom.clone();
    g.applyMatrix4(matrix);
    g.computeVertexNormals();

    const pAttr = g.attributes.position;
    const nAttr = g.attributes.normal;
    const col = new THREE.Color(colorHex);

    for (let i = 0; i < pAttr.count; i++) {
      this.positions.push(pAttr.getX(i), pAttr.getY(i), pAttr.getZ(i));
      this.normals.push(nAttr.getX(i), nAttr.getY(i), nAttr.getZ(i));
      this.colors.push(col.r, col.g, col.b);
      this.metas.push(anchorX, anchorZ, resist, 1.0);
    }
    g.dispose();
  }

  addBox(w, h, d, x, y, z, rotY, colorHex, anchorX, anchorZ, resist) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Matrix4()
      .makeRotationY(rotY)
      .setPosition(x, y, z);
    this.addGeometry(g, m, colorHex, anchorX, anchorZ, resist);
    g.dispose();
  }

  addCyl(rt, rb, h, segs, x, y, z, colorHex, anchorX, anchorZ, resist) {
    const g = new THREE.CylinderGeometry(rt, rb, h, segs);
    const m = new THREE.Matrix4().setPosition(x, y, z);
    this.addGeometry(g, m, colorHex, anchorX, anchorZ, resist);
    g.dispose();
  }

  build() {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    geom.setAttribute("normal", new THREE.Float32BufferAttribute(this.normals, 3));
    geom.setAttribute("aBaseColor", new THREE.Float32BufferAttribute(this.colors, 3));
    geom.setAttribute("aLandmarkMeta", new THREE.Float32BufferAttribute(this.metas, 4));
    return geom;
  }
}

const CITY_INSTANCED_VERT = `
in float aRoofFlag;
in vec4 aHouseMeta; // x=cx, y=cz, z=colorSeed, w=resist (0=wood, 0.9=RC concrete)

uniform float uEarthRadius;
uniform vec3 uBurstOrigin;
uniform float uGroundWaveR;
uniform float uBlastCollapseR;

out vec3 vWorldPos;
out vec3 vNormal;
out float vRoofFlag;
out float vSeed;
out float vDamage;
out float vDistHypo;

void main() {
  vec4 localWorld = instanceMatrix * vec4(position, 1.0);
  vec2 anchorXZ = aHouseMeta.xy;
  float resist = aHouseMeta.w;

  vec2 relHypo = anchorXZ - uBurstOrigin.xz;
  float distHypo = length(relHypo);
  vec2 radDir = distHypo > 1.0 ? relHypo / distHypo : vec2(1.0, 0.0);

  // Dynamic Mach-stem blast flattening when ground shockwave sweeps past building!
  float waveHit = smoothstep(distHypo - 35.0, distHypo + 85.0, uGroundWaveR);
  float lethalFactor = 1.0 - smoothstep(uBlastCollapseR * 0.68, uBlastCollapseR, distHypo);
  float collapse = waveHit * lethalFactor * (1.0 - resist * 0.86);

  // Flatten wooden structure down onto its exact local DEM ground terrace (instanceMatrix[3][1]) & shear outward!
  float baseY = instanceMatrix[3][1];
  float aboveGround = max(0.0, localWorld.y - baseY);
  localWorld.y = baseY + aboveGround * mix(1.0, 0.14, collapse);
  localWorld.xz += radDir * (aboveGround * 0.85 * collapse);

  float distCamXZ = length(localWorld.xz - cameraPosition.xz);
  float earthDrop = (distCamXZ * distCamXZ) / (2.0 * uEarthRadius);
  localWorld.y -= earthDrop;

  mat3 nMat = mat3(instanceMatrix);
  vec3 wn = normalize(nMat * normal);
  wn = normalize(mix(wn, vec3(0.0, 1.0, 0.0), collapse * 0.72));

  vWorldPos = localWorld.xyz;
  vNormal = wn;
  vRoofFlag = aRoofFlag;
  vSeed = aHouseMeta.z;
  vDamage = waveHit * lethalFactor;
  vDistHypo = distHypo;

  gl_Position = projectionMatrix * viewMatrix * localWorld;
}
`;

const CITY_INSTANCED_FRAG = `
precision highp float;

in vec3 vWorldPos;
in vec3 vNormal;
in float vRoofFlag;
in float vSeed;
in float vDamage;
in float vDistHypo;

out vec4 fragColor;

uniform vec3 uSunDir;
uniform vec3 uBurstOrigin;
uniform float uBurstDt;
uniform float uFlashPower;

${SKY_SCATTERING_GLSL}

void main() {
  vec3 viewVec = vWorldPos - cameraPosition;
  float dist = length(viewVec);
  vec3 rayDir = viewVec / max(1e-3, dist);

  // Authentic 1945 Japanese dark grey-slate kawara tile roofs vs warm weathered cedar/stucco walls
  vec3 roofCol = mix(vec3(0.115, 0.122, 0.135), vec3(0.185, 0.175, 0.168), vSeed);
  vec3 wallCol = mix(vec3(0.24, 0.19, 0.145), vec3(0.42, 0.38, 0.32), fract(vSeed * 3.7));
  // Occasional light concrete commercial facade (seed > 0.90)
  if (vSeed > 0.90) {
    roofCol = vec3(0.32, 0.31, 0.29);
    wallCol = vec3(0.52, 0.49, 0.44);
  }
  vec3 albedo = mix(wallCol, roofCol, vRoofFlag);

  // Blast charring & splintered rubble darkening
  albedo = mix(albedo, vec3(0.055, 0.046, 0.042), vDamage * 0.88);

  vec3 nrm = normalize(vNormal);
  float nDotL = max(0.12, dot(nrm, uSunDir));
  vec3 illum = vec3(2.65, 2.46, 2.20) * nDotL + vec3(0.32, 0.40, 0.52);

  if (uBurstDt > 0.0) {
    vec3 toB = uBurstOrigin - vWorldPos;
    float dB2 = dot(toB, toB);
    float bNdotL = max(0.0, dot(nrm, normalize(toB)));
    illum += vec3(4.5, 3.0, 1.7) * (uFlashPower * 8.5e6 / (3.0e5 + dB2)) * bNdotL;
  }

  // Secondary firestorm embers inside blasted wooden rubble
  vec3 fireGlow = vec3(0.0);
  if (uBurstDt > 1.5 && vDamage > 0.45) {
    float spark = smoothstep(0.72, 0.96, fract(vSeed * 19.3));
    fireGlow = vec3(2.6, 0.62, 0.09) * spark * vDamage * smoothstep(1.5, 9.0, uBurstDt);
  }

  vec3 surf = albedo * illum + fireGlow;
  vec3 skyHorizon = computePhysicalSky(cameraPosition, rayDir, uSunDir, uBurstOrigin, uFlashPower);
  float hazeTrans = exp(-dist * 0.0000105);
  fragColor = vec4(mix(skyHorizon, surf, hazeTrans), 1.0);
}
`;

const LANDMARK_VERT = `
in vec3 aBaseColor;
in vec4 aLandmarkMeta; // x=anchorX, y=anchorZ, z=resist (0=blows away, 1=survives!), w=1

uniform float uEarthRadius;
uniform vec3 uBurstOrigin;
uniform float uGroundWaveR;

out vec3 vWorldPos;
out vec3 vNormal;
out vec3 vColor;
out float vScorch;

void main() {
  vec3 wp = position;
  vec2 anchorXZ = aLandmarkMeta.xy;
  float resist = aLandmarkMeta.z;

  float distHypo = length(anchorXZ - uBurstOrigin.xz);
  float waveHit = smoothstep(distHypo - 25.0, distHypo + 60.0, uGroundWaveR);

  // Elements with resist < 0.5 (e.g. A-Bomb Dome copper roof skin, Castle wooden keep, Shima brick roof)
  // collapse / strip away when the Mach stem hits, leaving steel dome ribs & concrete walls standing!
  if (resist < 0.5) {
    float crush = waveHit * (1.0 - resist);
    float aboveBase = max(0.0, wp.y - 2.2);
    wp.y = 2.2 + aboveBase * mix(1.0, 0.04, crush);
  }

  float distCamXZ = length(wp.xz - cameraPosition.xz);
  wp.y -= (distCamXZ * distCamXZ) / (2.0 * uEarthRadius);

  vWorldPos = wp;
  vNormal = normalize(normal);
  vColor = aBaseColor;
  vScorch = waveHit * (1.0 - smoothstep(900.0, 2200.0, distHypo));

  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const LANDMARK_FRAG = `
precision highp float;

in vec3 vWorldPos;
in vec3 vNormal;
in vec3 vColor;
in float vScorch;

out vec4 fragColor;

uniform vec3 uSunDir;
uniform vec3 uBurstOrigin;
uniform float uBurstDt;
uniform float uFlashPower;

${SKY_SCATTERING_GLSL}

void main() {
  vec3 viewVec = vWorldPos - cameraPosition;
  float dist = length(viewVec);
  vec3 rayDir = viewVec / max(1e-3, dist);

  vec3 albedo = mix(vColor, vec3(0.08, 0.072, 0.068), vScorch * 0.72);
  vec3 nrm = normalize(vNormal);
  float nDotL = max(0.14, dot(nrm, uSunDir));
  vec3 illum = vec3(2.65, 2.46, 2.20) * nDotL + vec3(0.34, 0.42, 0.54);

  if (uBurstDt > 0.0) {
    vec3 toB = uBurstOrigin - vWorldPos;
    float dB2 = dot(toB, toB);
    float bNdotL = max(0.0, dot(nrm, normalize(toB)));
    illum += vec3(4.5, 3.0, 1.7) * (uFlashPower * 8.5e6 / (3.0e5 + dB2)) * bNdotL;
  }

  vec3 surf = albedo * illum;
  vec3 skyHorizon = computePhysicalSky(cameraPosition, rayDir, uSunDir, uBurstOrigin, uFlashPower);
  float hazeTrans = exp(-dist * 0.0000105);
  fragColor = vec4(mix(skyHorizon, surf, hazeTrans), 1.0);
}
`;

function buildLandmarksGeometry(geo, demArrays) {
  const b = new LandmarkBuilder();
  const baseElev = 2.2;

  // 1. AIOI "T" BRIDGE at [-190, -150] (~242m NW of Shima Hospital [0, 0]!)
  const ap = geo.aimingPoint;
  // Main East-West Steel Girder Deck spanning Old Ota -> Honkawa/Motoyasu fork
  b.addBox(ap.mainSpanHalfLen * 2.15, 2.4, ap.deckWidth, ap.x, baseElev + 4.2, ap.z, ap.mainSpanAzimuthRad, 0x62686c, ap.x, ap.z, 0.92);
  // Steel Side Truss Parapets (bright grey-olive steel visible from 31,060 ft!)
  b.addBox(ap.mainSpanHalfLen * 2.15, 2.2, 1.4, ap.x, baseElev + 6.0, ap.z - ap.deckWidth * 0.46, ap.mainSpanAzimuthRad, 0x7b8286, ap.x, ap.z, 0.88);
  b.addBox(ap.mainSpanHalfLen * 2.15, 2.2, 1.4, ap.x, baseElev + 6.0, ap.z + ap.deckWidth * 0.46, ap.mainSpanAzimuthRad, 0x7b8286, ap.x, ap.z, 0.88);
  // T-Bridge Stem heading South-Southwest onto Nakajima northern tip!
  const stemCx = ap.x - 10.0;
  const stemCz = ap.z + ap.stemLen * 0.5 + 4.0;
  b.addBox(13.5, 2.3, ap.stemLen, stemCx, baseElev + 4.0, stemCz, 0.16, 0x666c70, ap.x, ap.z, 0.92);
  // Concrete River Piers beneath Aioi T-Bridge
  for (const pxOff of [-46, -18, 12, 42]) {
    b.addBox(3.8, 8.0, ap.deckWidth * 0.9, ap.x + pxOff, 1.8, ap.z, ap.mainSpanAzimuthRad, 0x8a867e, ap.x, ap.z, 1.0);
  }
  b.addBox(12.0, 8.0, 3.8, stemCx - 4.0, 1.8, ap.z + 38.0, 0.16, 0x8a867e, ap.x, ap.z, 1.0);

  // 2. PREFECTURAL INDUSTRIAL PROMOTION HALL (A-BOMB DOME / 原爆圆顶馆) at [-56, -34]
  const dm = geo.landmarks.aBombDome;
  // 3-story brick/concrete Secessionist wings + central rotunda (resist=1.0: survives blast vertically!)
  b.addBox(46.0, 14.5, 19.0, dm.x, baseElev + 7.25, dm.z, dm.rotY, 0x8c7b6b, dm.x, dm.z, 1.0);
  b.addCyl(9.2, 9.8, 19.5, 16, dm.x - 3.0, baseElev + 9.75, dm.z + 2.0, 0x998877, dm.x, dm.z, 1.0);
  // Cylindrical 5-story dome drum
  const drumX = dm.x - 3.0;
  const drumZ = dm.z + 2.0;
  b.addCyl(6.8, 7.0, 7.5, 16, drumX, baseElev + 21.5, drumZ, 0xa29382, dm.x, dm.z, 1.0);
  // Pre-blast Copper Green Ellipsoidal Dome Skin (resist=0.0 -> stripped instantly by blast wave!)
  const domeSkin = new THREE.SphereGeometry(6.9, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52);
  domeSkin.scale(1.0, 0.82, 1.22);
  b.addGeometry(
    domeSkin,
    new THREE.Matrix4().makeRotationY(dm.rotY).setPosition(drumX, baseElev + 25.0, drumZ),
    0x456b5c,
    dm.x,
    dm.z,
    0.0
  );
  domeSkin.dispose();
  // Iconic Skeletal Steel Dome Arch Ribs & Rings (resist=1.0 -> remains standing above ruins!)
  for (let k = 0; k < 6; k++) {
    const arch = new THREE.TorusGeometry(6.75, 0.28, 6, 18, Math.PI);
    const mArch = new THREE.Matrix4()
      .makeRotationY(dm.rotY + (k * Math.PI) / 6)
      .setPosition(drumX, baseElev + 25.0, drumZ);
    b.addGeometry(arch, mArch, 0x2d3033, dm.x, dm.z, 1.0);
    arch.dispose();
  }
  const ringMid = new THREE.TorusGeometry(5.4, 0.26, 6, 20);
  ringMid.rotateX(Math.PI * 0.5);
  b.addGeometry(ringMid, new THREE.Matrix4().setPosition(drumX, baseElev + 27.6, drumZ), 0x2d3033, dm.x, dm.z, 1.0);
  ringMid.dispose();

  // 3. SHIMA SURGICAL HOSPITAL at [0, 0] (Exact Ground Zero directly beneath 580m burst!)
  const sh = geo.landmarks.shimaHospital;
  b.addBox(28.0, 9.5, 16.0, sh.x, baseElev + 4.75, sh.z, sh.rotY, 0x9e5c47, sh.x, sh.z, 0.12);
  b.addBox(12.0, 9.0, 18.0, sh.x - 10.0, baseElev + 4.5, sh.z + 10.0, sh.rotY, 0x945542, sh.x, sh.z, 0.12);
  // Twin white concrete entrance pillars
  b.addCyl(0.75, 0.75, 8.5, 10, sh.x - 3.2, baseElev + 4.25, sh.z - 8.5, 0xcac6bc, sh.x, sh.z, 0.45);
  b.addCyl(0.75, 0.75, 8.5, 10, sh.x + 3.2, baseElev + 4.25, sh.z - 8.5, 0xcac6bc, sh.x, sh.z, 0.45);

  // 4. HIROSHIMA CASTLE (Stone Ishigaki Rampart + 5-Tier Wooden Tenshu Keep inside Moat)
  const cm = geo.castleMoat;
  // Stone rampart foundation survives (resist=1.0)
  b.addBox(68.0, 11.5, 58.0, cm.cx - 25.0, baseElev + 5.75, cm.cz - 30.0, 0.0, 0x6e6c66, cm.cx, cm.cz, 1.0);
  // 5-tier Castle Keep (resist=0.0 -> blown down when blast reaches 966m!)
  for (let tier = 0; tier < 5; tier++) {
    const s = 26.0 - tier * 3.8;
    const ty = baseElev + 11.5 + tier * 5.2 + 2.6;
    b.addBox(s, 4.8, s, cm.cx - 25.0, ty, cm.cz - 30.0, 0.0, 0xd8d4ca, cm.cx, cm.cz, 0.0);
    b.addBox(s + 5.0, 1.4, s + 5.0, cm.cx - 25.0, ty + 2.2, cm.cz - 30.0, 0.0, 0x26292e, cm.cx, cm.cz, 0.0);
  }

  // 5. FUKUYA DEPARTMENT STORE & MODERN RC BUILDINGS (Survive structurally, resist=0.95)
  const fk = geo.landmarks.fukuyaDeptStore;
  b.addBox(66.0, 31.0, 38.0, fk.x, baseElev + 15.5, fk.z, fk.rotY, 0xb8b0a2, fk.x, fk.z, 0.95);
  const cs = geo.landmarks.chugokuShimbun;
  b.addBox(44.0, 22.0, 28.0, cs.x, baseElev + 11.0, cs.z, cs.rotY, 0xa8a195, cs.x, cs.z, 0.95);
  // Bank of Japan Hiroshima Branch (~380m South of Hypocenter on Rijo-dori)
  b.addBox(38.0, 19.0, 32.0, -32.0, baseElev + 9.5, 365.0, 0.02, 0xb2aba0, -32.0, 365.0, 0.96);

  // 6. 8 MAJOR RIVER BRIDGES ACROSS OTA DELTA CHANNELS
  for (const br of geo.bridges) {
    const mx = 0.5 * (br.x1 + br.x2);
    const mz = 0.5 * (br.z1 + br.z2);
    const span = Math.hypot(br.x2 - br.x1, br.z2 - br.z1) + 18.0;
    const ang = -Math.atan2(br.z2 - br.z1, br.x2 - br.x1);
    b.addBox(span, 2.0, br.width, mx, baseElev + 3.6, mz, ang, 0x6a6e72, mx, mz, 0.85);
    b.addBox(3.4, 7.0, br.width * 0.85, mx - span * 0.22, 1.5, mz, ang, 0x827f78, mx, mz, 1.0);
    b.addBox(3.4, 7.0, br.width * 0.85, mx + span * 0.22, 1.5, mz, ang, 0x827f78, mx, mz, 1.0);
  }

  // 7. HIROSHIMA STATION COMPLEX (East-North-East [1420, -1080]) & ARMY CLOTHING DEPOT RED-BRICK WAREHOUSES (Minami [1260, 1780])
  const stElev = sampleDemElevation(demArrays, 1420.0, -1080.0);
  b.addBox(115.0, 16.0, 32.0, 1420.0, stElev + 8.0, -1080.0, -0.18, 0x9c8e7e, 1420.0, -1080.0, 0.90);
  for (let p = 0; p < 3; p++) {
    b.addBox(160.0, 5.5, 9.0, 1420.0, stElev + 2.8, -1125.0 - p * 18.0, -0.18, 0x5c6066, 1420.0, -1125.0, 0.85);
  }
  // Iconic 4-row 1913 Imperial Japanese Army Clothing Depot (陸軍被服支廠, survived structurally!)
  const depElev = sampleDemElevation(demArrays, 1260.0, 1780.0);
  for (let wIdx = 0; wIdx < 4; wIdx++) {
    const wz = 1690.0 + wIdx * 52.0;
    b.addBox(94.0, 14.5, 21.0, 1260.0, depElev + 7.25, wz, 0.08, 0x8d4a3a, 1260.0, wz, 0.98);
  }

  // 8. UJINA MILITARY SHIPPING PIERS (1945 Southern Peninsula Waterfront jutting into 0m Hiroshima Bay!)
  const uj = geo.landmarks.ujinaPort;
  for (let p = 0; p < uj.pierCount; p++) {
    const px = uj.x - 360.0 + p * 185.0;
    const pz = uj.z + 140.0;
    b.addBox(26.0, 4.2, 340.0, px, 2.1, pz, 0.0, 0x76736c, px, pz, 1.0);
    b.addBox(16.0, 8.5, 190.0, px, 6.2, pz - 30.0, 0.0, 0x45494e, px, pz, 0.75);
  }

  return b.build();
}

// Compute organic 1945 Hiroshima urban density [0..1] across the 6 finger islands, Ujina peninsula,
// Hijiyama-east Danbara, Yokogawa/Mitaki northern valley, Koi western rail town & Mukainada eastern corridor!
function computeUrbanDensity1945(px, pz) {
  // 1. Central 6-island delta core (Nakajima, Honkawa, Hatchobori, Kamiyacho, Otemachi, Takeya)
  const dCore = Math.hypot((px - 40.0) * 0.84, (pz - 320.0) * 0.82);
  let dens = Math.max(0.0, Math.min(1.0, 1.28 - dCore / 2550.0));

  // 2. Southern delta finger extensions (Funairi, Eba, Yoshijima, Minami) & long 1945 Ujina Port corridor
  const dFingers = Math.hypot((px + 420.0) / 1650.0, (pz - 1850.0) / 1450.0);
  if (dFingers < 1.0) dens = Math.max(dens, (1.0 - dFingers) * 0.86);

  const dUjina = Math.hypot((px - 960.0) / 680.0, (pz - 2950.0) / 1480.0);
  if (dUjina < 1.0) dens = Math.max(dens, (1.0 - dUjina * 0.75) * 0.84);

  // 3. Hiroshima Station, Kaniya & Danbara (wrapping around 64m Hijiyama Hill at [1673, 1008])
  const dStation = Math.hypot((px - 1480.0) / 1280.0, (pz + 820.0) / 1150.0);
  if (dStation < 1.0) dens = Math.max(dens, (1.0 - dStation * 0.82) * 0.90);

  const dDanbara = Math.hypot((px - 1750.0) / 1150.0, (pz - 1150.0) / 1350.0);
  if (dDanbara < 1.0) dens = Math.max(dens, (1.0 - dDanbara * 0.80) * 0.82);

  // 4. Northern Ota & Ushita Valley Corridors (Yokogawa -> Misasa -> Mitaki & Ushita)
  const dOtaNorth = Math.hypot((px + 420.0 - pz * 0.10) / 860.0, (pz + 2350.0) / 1650.0);
  if (dOtaNorth < 1.0) dens = Math.max(dens, (1.0 - dOtaNorth * 0.85) * 0.80);

  const dUshita = Math.hypot((px - 760.0) / 680.0, (pz + 2150.0) / 1150.0);
  if (dUshita < 1.0) dens = Math.max(dens, (1.0 - dUshita * 0.85) * 0.72);

  // 5. Western Koi / Fukushima Sanyo Rail Corridor & Eastern Mukainada / Kaita Industrial Corridor
  const dKoi = Math.hypot((px + 2750.0) / 1350.0, (pz + 180.0) / 920.0);
  if (dKoi < 1.0) dens = Math.max(dens, (1.0 - dKoi * 0.85) * 0.76);

  const dMukainada = Math.hypot((px - 2950.0) / 1250.0, (pz - 1150.0) / 980.0);
  if (dMukainada < 1.0) dens = Math.max(dens, (1.0 - dMukainada * 0.85) * 0.74);

  return dens;
}

export function createHiroshimaCity(mission, sharedTerrainUniforms, geo = HIROSHIMA_GEO, demArraysOverride = null) {
  const demArrays = demArraysOverride || getHiroshimaDemArrays();
  const rand = mulberry32(19450806);
  const bounds = geo.cityBounds;
  const cm = geo.castleMoat;

  // Terrain-following urban sampling across real 1945 Hiroshima delta islands, foothills & valley corridors!
  const placements = [];
  const stepX = 28.5;
  const stepZ = 26.5;

  for (let gz = bounds.minZ; gz <= bounds.maxZ; gz += stepZ) {
    for (let gx = bounds.minX; gx <= bounds.maxX; gx += stepX) {
      const px = gx + (rand() - 0.5) * 10.5;
      const pz = gz + (rand() - 0.5) * 9.8;

      const urbanDens = computeUrbanDensity1945(px, pz);
      if (urbanDens <= 0.04 || rand() > urbanDens) continue;

      // Sample 1945 DEM elevation & slope:
      // - Never place buildings in Hiroshima Bay / tidal mudflats (elev < 1.35m)
      // - Let hillside houses climb foothills up to 34m MSL where slope <= 15.5 deg!
      const groundElev = sampleDemElevation(demArrays, px, pz);
      if (groundElev < 1.35 || groundElev > 34.0) continue;

      const slopeDeg = sampleDemSlopeDeg(demArrays, px, pz);
      if (slopeDeg > 15.5) continue;
      if (groundElev > 9.0 && rand() > Math.max(0.15, 1.0 - (groundElev - 9.0) / 26.0)) continue;

      // 1. Strictly avoid all 7 Ota River channels (+12m embankment setback)
      if (riverSignedDist(px, pz, geo) < 12.0) continue;

      // 2. Strictly avoid Hiroshima Castle + Outer Moat + Western Parade Ground clearing!
      if (Math.abs(px - cm.cx) < cm.halfW + 18.0 && Math.abs(pz - cm.cz) < cm.halfD + 18.0) continue;
      if (Math.abs(px + 120.0) < 195.0 && Math.abs(pz + 620.0) < 185.0) continue;

      // 3. Avoid wooded summit core of Hijiyama Park [1673, 1008] & Eba-yama Park [-1763, 2816]
      if (Math.hypot((px - 1673.0) / 310.0, (pz - 1008.0) / 440.0) < 1.0 && groundElev > 16.0) continue;
      if (Math.hypot((px + 1763.0) / 220.0, (pz - 2816.0) / 220.0) < 1.0 && groundElev > 11.0) continue;

      // 4. Avoid Aioi-dori East-West boulevard, 1945 Tsurumi-Funairi Firebreak Strip (z ~ +540m), & district street grids!
      if (Math.abs(pz - (-138.0 + (px + 190.0) * 0.062)) < 18.0) continue;
      if (Math.abs(pz - 540.0) < 34.0 && Math.abs(px) < 1750.0) continue;

      // District-specific historic street-grid orientation (central delta -7°, Danbara +8°, Koi -17°, Ujina 0°)
      let gridAzim = -0.125;
      if (px > 920.0 && pz > -200.0) gridAzim = 0.14;
      else if (px < -1850.0) gridAzim = -0.29;
      else if (pz > 2200.0 && px > 350.0) gridAzim = 0.02;

      const ca = Math.cos(gridAzim);
      const sa = Math.sin(gridAzim);
      const rx = ca * px - sa * pz;
      const rz = sa * px + ca * pz;
      const modX = Math.abs((((rx / 205.0) % 1) + 1) % 1 - 0.5) * 205.0;
      const modZ = Math.abs((((rz / 195.0) % 1) + 1) % 1 - 0.5) * 195.0;
      if (modX > 91.0 || modZ > 86.0) continue;

      // 5. Avoid dedicated landmark footprints (A-Bomb Dome, Shima Hospital, Fukuya, Chugoku Shimbun, BoJ, Station, Clothing Depot)
      if (Math.hypot(px - geo.landmarks.aBombDome.x, pz - geo.landmarks.aBombDome.z) < 42.0) continue;
      if (Math.hypot(px, pz) < 30.0) continue;
      if (Math.hypot(px - geo.landmarks.fukuyaDeptStore.x, pz - geo.landmarks.fukuyaDeptStore.z) < 52.0) continue;
      if (Math.hypot(px - geo.landmarks.chugokuShimbun.x, pz - geo.landmarks.chugokuShimbun.z) < 38.0) continue;
      if (Math.hypot(px + 32.0, pz - 365.0) < 34.0) continue;
      if (Math.hypot(px - 1420.0, pz + 1080.0) < 88.0) continue;
      if (Math.abs(px - 1260.0) < 68.0 && pz > 1650.0 && pz < 1900.0) continue;

      const dCommercial = Math.min(
        Math.hypot(px - 220.0, pz - 60.0),
        Math.hypot(px - 1350.0, pz + 960.0) * 1.15
      );
      const isIndustrialZone = (pz > 1650.0 && px > 450.0) || px > 2150.0 || (px < -1650.0 && pz > 400.0);
      const isRC = dCommercial < 1150.0 && rand() > 0.945;
      const isFactory = !isRC && isIndustrialZone && rand() > 0.88;
      const isTownhouse = !isRC && !isFactory && dCommercial < 1450.0 && rand() > 0.68;

      let w, d, h, seed = rand(), resist = 0.0;
      if (isRC) {
        w = 15.5 + rand() * 11.0;
        d = 14.5 + rand() * 9.5;
        h = 14.0 + rand() * 11.5;
        seed = 0.91 + rand() * 0.085; // Concrete facade palette in fragment shader
        resist = 0.93;
      } else if (isFactory) {
        w = 22.0 + rand() * 18.0;
        d = 12.5 + rand() * 7.5;
        h = 8.2 + rand() * 4.5;
        resist = 0.35;
      } else if (isTownhouse) {
        w = 10.5 + rand() * 8.0;
        d = 11.0 + rand() * 9.0;
        h = 7.6 + rand() * 4.2;
      } else {
        w = 8.5 + rand() * 8.5;
        d = 8.0 + rand() * 8.0;
        h = 4.6 + rand() * 3.8;
      }
      const yaw = gridAzim + (rand() > 0.5 ? 0 : Math.PI * 0.5) + (rand() - 0.5) * 0.06;

      placements.push({
        x: px,
        y: groundElev,
        z: pz,
        w,
        h,
        d,
        yaw,
        seed,
        resist,
      });
    }
  }

  const count = placements.length;
  const houseGeom = createGabledHouseGeometry();
  const metaArray = new Float32Array(count * 4);

  const cityUniforms = {
    uEarthRadius: sharedTerrainUniforms.uEarthRadius,
    uSunDir: sharedTerrainUniforms.uSunDir,
    uBurstDt: sharedTerrainUniforms.uBurstDt,
    uBurstOrigin: sharedTerrainUniforms.uBurstOrigin,
    uFlashPower: sharedTerrainUniforms.uFlashPower,
    uGroundWaveR: sharedTerrainUniforms.uGroundWaveR,
    uBlastCollapseR: { value: bounds.blastCollapseRadiusM },
  };

  const cityMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: CITY_INSTANCED_VERT,
    fragmentShader: CITY_INSTANCED_FRAG,
    uniforms: cityUniforms,
  });

  const instancedHouses = new THREE.InstancedMesh(houseGeom, cityMat, count);
  instancedHouses.frustumCulled = false;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const p = placements[i];
    // Anchor house slightly (-0.25m) into local ground terrace so sloped foothill foundations never float!
    dummy.position.set(p.x, p.y - 0.25, p.z);
    dummy.rotation.set(0, p.yaw, 0);
    dummy.scale.set(p.w, p.h, p.d);
    dummy.updateMatrix();
    instancedHouses.setMatrixAt(i, dummy.matrix);

    metaArray[i * 4] = p.x;
    metaArray[i * 4 + 1] = p.z;
    metaArray[i * 4 + 2] = p.seed;
    metaArray[i * 4 + 3] = p.resist;
  }
  instancedHouses.instanceMatrix.needsUpdate = true;
  houseGeom.setAttribute("aHouseMeta", new THREE.InstancedBufferAttribute(metaArray, 4));

  const landmarkGeom = buildLandmarksGeometry(geo, demArrays);
  const landmarkMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: LANDMARK_VERT,
    fragmentShader: LANDMARK_FRAG,
    uniforms: cityUniforms,
  });
  const landmarksMesh = new THREE.Mesh(landmarkGeom, landmarkMat);
  landmarksMesh.frustumCulled = false;

  const group = new THREE.Group();
  group.add(instancedHouses, landmarksMesh);

  return {
    group,
    buildingCount: count,
    dispose() {
      houseGeom.dispose();
      cityMat.dispose();
      landmarkGeom.dispose();
      landmarkMat.dispose();
    },
  };
}
