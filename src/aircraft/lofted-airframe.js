import * as THREE from "../../vendor/three.module.js";
import { createStarAndBarsTexture, buildLittleBoyMesh } from "./fuselage-empennage.js";

// Boeing 117 High-Aspect-Ratio Lofted Wing (22% root -> 9% tip), Conformal Surface Insignia,
// 4x Wright R-3350 Twin-Chin Intake Nacelles (with Beaver Tail, BMG-2 Turbos & Open Cowl Flaps),
// and Curtiss Electric 4-Blade Reversible-Pitch Cuffed Propellers (Compact Silver Dome Hub — ZERO Fighter Cone!).

function createAlcladTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#cbd3dc";
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = "rgba(62, 70, 78, 0.34)";
  ctx.lineWidth = 1.5;
  for (let x = 0; x < 512; x += 64) {
    ctx.fillStyle = (x / 64) % 2 === 0 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
    ctx.fillRect(x, 0, 64, 512);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y < 512; y += 96) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCowlingTexture(hasAntiGlare, isLeftInner) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#cfd6de";
  ctx.fillRect(0, 0, 512, 512);

  // Panel lines & cooling cowl flap seams
  ctx.fillStyle = "rgba(0, 0, 0, 0.07)";
  ctx.fillRect(0, 128, 512, 38);
  ctx.strokeStyle = "rgba(54, 62, 70, 0.48)";
  ctx.lineWidth = 2;
  for (const y of [68, 128, 166, 290, 410]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }
  for (let x = 0; x < 512; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, 128);
    ctx.lineTo(x, 166);
    ctx.stroke();
  }

  // Olive-drab anti-glare paint on inboard/upper surface of inner #2/#3 nacelles (zero Z-fighting!)
  if (hasAntiGlare) {
    ctx.fillStyle = "#353d2f";
    // u=0 is top (0 rad), u=0.25 is +X, u=0.75 is -X
    const cx = isLeftInner ? 112 : 400;
    ctx.beginPath();
    ctx.roundRect(cx - 92, 16, 184, 210, 18);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRadialEngineFaceTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const cx = 128, cy = 128;

  ctx.fillStyle = "#111417";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.fillStyle = i % 2 === 0 ? "#2f363e" : "#22272d";
    ctx.fillRect(-10, 38, 20, 76);
    ctx.strokeStyle = "#4d5661";
    ctx.lineWidth = 1.5;
    for (let r = 44; r < 110; r += 6) {
      ctx.beginPath();
      ctx.moveTo(-9, r);
      ctx.lineTo(9, r);
      ctx.stroke();
    }
    ctx.strokeStyle = "#949fa9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 36);
    ctx.lineTo(-6, 92);
    ctx.moveTo(4, 36);
    ctx.lineTo(6, 92);
    ctx.stroke();
    ctx.restore();
  }

  // Wright R-3350 planetary reduction gear case
  const grad = ctx.createRadialGradient(cx, cy, 6, cx, cy, 44);
  grad.addColorStop(0, "#7c8894");
  grad.addColorStop(0.75, "#49515a");
  grad.addColorStop(1, "#1e2226");
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Curtiss Electric 4-Blade Cuffed Propeller Motion-Blur Disc:
// Features dark rubber/sheet-metal inner Cuff Ring (r = 0.08..0.33), duralumin blade sweep, and yellow tips!
function createCurtissPropBlurTexture() {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(S, S);
  const d = img.data;

  const half = S * 0.5;
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const dx = (px + 0.5 - half) / half;
      const dy = (py + 0.5 - half) / half;
      const r = Math.hypot(dx, dy);
      const idx = (py * S + px) * 4;

      if (r > 0.99 || r < 0.065) {
        d[idx + 3] = 0;
        continue;
      }

      const theta = Math.atan2(dy, dx);
      const bladeWave = Math.pow(0.5 + 0.5 * Math.cos(4.0 * theta + r * 0.38), 2.3);
      const cuffZone = 1.0 - Math.min(1.0, Math.max(0.0, (r - 0.14) / 0.21));
      const rootWeight = (1.0 - Math.min(1.0, Math.pow(r, 0.75))) * 0.30 + 0.05;
      const outerFade = 1.0 - Math.pow(Math.max(0, (r - 0.89) / 0.10), 2.0);
      let alpha = (0.045 + bladeWave * (rootWeight + cuffZone * 0.14)) * Math.max(0, outerFade);

      // Black Curtiss Electric blade cuffs near root (r < 0.34), silver-grey duralumin outer blades!
      let cr = 68 * (1 - cuffZone * 0.72);
      let cg = 74 * (1 - cuffZone * 0.72);
      let cb = 80 * (1 - cuffZone * 0.72);

      const specWave = Math.pow(0.5 + 0.5 * Math.cos(4.0 * theta + r * 0.38 - 0.20), 5.0) * (1.0 - cuffZone * 0.65);
      cr += specWave * 88;
      cg += specWave * 94;
      cb += specWave * 102;

      if (r > 0.89 && r < 0.98) {
        const tipRing = Math.exp(-Math.pow((r - 0.935) / 0.022, 2.0));
        const tipMod = 0.55 + 0.45 * bladeWave;
        cr = cr * (1 - tipRing) + 238 * tipRing;
        cg = cg * (1 - tipRing) + 198 * tipRing;
        cb = cb * (1 - tipRing) + 56 * tipRing;
        alpha = Math.max(alpha, tipRing * tipMod * 0.28);
      }

      d[idx] = Math.min(255, Math.round(cr));
      d[idx + 1] = Math.min(255, Math.round(cg));
      d[idx + 2] = Math.min(255, Math.round(cb));
      d[idx + 3] = Math.min(255, Math.round(alpha * 255));
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Evaluate exact Boeing 117 airfoil coordinates at spanwise distance spanDist (>0) and chord fraction xc [0,1]
function evalBoeing117Point(wingSpec, spanDist, xc, signUpper) {
  const s = Math.max(0, Math.min(1, (spanDist - 1.25) / (wingSpec.halfSpan - 1.25)));
  const sweepTan = Math.tan((wingSpec.sweepDeg * Math.PI) / 180);
  const dihedralSin = Math.sin((wingSpec.dihedralDeg * Math.PI) / 180);

  const chord = wingSpec.rootChord + (wingSpec.tipChord - wingSpec.rootChord) * s;
  const thickRatio = wingSpec.thicknessRatioRoot + (wingSpec.thicknessRatioTip - wingSpec.thicknessRatioRoot) * s;
  const leZ = wingSpec.rootLEZ + spanDist * sweepTan;
  const baseY = wingSpec.rootY + spanDist * dihedralSin;

  const yt =
    5.0 *
    thickRatio *
    (0.2969 * Math.sqrt(Math.max(0, xc)) -
      0.126 * xc -
      0.3516 * xc * xc +
      0.2843 * xc * xc * xc -
      0.1036 * xc * xc * xc * xc);
  // Boeing 117 high-lift camber line
  const yc =
    xc < 0.4
      ? (0.026 / 0.16) * (2 * 0.4 * xc - xc * xc)
      : (0.026 / 0.36) * (1 - 2 * 0.4 + 2 * 0.4 * xc - xc * xc);

  return {
    y: baseY + (yc + signUpper * yt) * chord,
    z: leZ + xc * chord,
    chord,
  };
}

function buildBoeing117WingSide(wingSpec, sideSign) {
  const spanSegs = 32;
  const profileSegs = 34;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= spanSegs; i++) {
    const s = i / spanSegs;
    const spanDist = 1.25 + s * (wingSpec.halfSpan - 1.25);
    const x = sideSign * spanDist;
    const tipPinch = s > 0.96 ? Math.sqrt(Math.max(0.04, 1.0 - Math.pow((s - 0.96) / 0.04, 2))) : 1.0;

    for (let j = 0; j <= profileSegs; j++) {
      const theta = (j / profileSegs) * Math.PI * 2;
      const xc = 0.5 * (1.0 + Math.cos(theta));
      const signUpper = Math.sin(theta) >= 0 ? 1 : -1;
      const pt = evalBoeing117Point(wingSpec, spanDist, xc, signUpper * tipPinch);

      positions.push(x, pt.y, pt.z);
      uvs.push(s * 3.5, j / profileSegs);
    }
  }

  const ring = profileSegs + 1;
  for (let i = 0; i < spanSegs; i++) {
    for (let j = 0; j < profileSegs; j++) {
      const a = i * ring + j;
      const b = (i + 1) * ring + j;
      const c = (i + 1) * ring + (j + 1);
      const d = i * ring + (j + 1);
      // theta in (0, PI) moves toward -Z (leading edge), so sideSign < 0 requires (a,c,b) for +Y upper normal!
      if (sideSign < 0) indices.push(a, c, b, a, d, c);
      else indices.push(a, b, c, a, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

// Conformal USAAF Star-and-Bars Mesh projected directly onto curved Boeing 117 airfoil surface (+4mm offset)!
function buildConformalWingInsignia(wingSpec, sideSign, signUpper, spanCenter, spanWidth) {
  const nx = 16;
  const nz = 12;
  const pos = [];
  const uvs = [];
  const idx = [];

  for (let ix = 0; ix <= nx; ix++) {
    const ux = ix / nx;
    const spanDist = spanCenter + (ux - 0.5) * spanWidth;
    const x = sideSign * spanDist;

    for (let iz = 0; iz <= nz; iz++) {
      const uz = iz / nz;
      const xc = 0.18 + uz * 0.56;
      const pt = evalBoeing117Point(wingSpec, spanDist, xc, signUpper);
      pos.push(x, pt.y + signUpper * 0.004, pt.z);
      const texU = sideSign < 0 ? 1.0 - ux : ux;
      // Single point of USAAF 5-pointed star always points forward (-Z leading edge, uz = 0)!
      const texV = 1.0 - uz;
      uvs.push(texU, texV);
    }
  }

  const row = nz + 1;
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      const a = ix * row + iz;
      const b = (ix + 1) * row + iz;
      const c = (ix + 1) * row + (iz + 1);
      const d = ix * row + (iz + 1);
      // (b - a) x (d - a) = (sideSign * dx, 0, 0) x (0, 0, +dz) = (0, -sideSign * dx * dz, 0)
      if (sideSign * signUpper < 0) idx.push(a, b, c, a, c, d);
      else idx.push(a, c, b, a, d, c);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Parametric Wright R-3350 Nacelle Loft:
// - Twin-ellipse frontal lip with pronounced lower Dual Chin Oil/Intercooler Intake bulge!
// - Open flared Cowl Flaps ring around z = 1.28m
// - Streamlined Beaver Tail fairing tapering cleanly behind wing trailing edge!
function buildR3350TwinChinNacelleGeometry(R, totalLen) {
  const zStations = [
    { z: 0.14, rScale: 0.68, chinDrop: 0.12, vShrink: 1.0, flare: 0.0 },
    { z: 0.02, rScale: 0.80, chinDrop: 0.20, vShrink: 1.02, flare: 0.0 },
    { z: 0.00, rScale: 0.91, chinDrop: 0.25, vShrink: 1.05, flare: 0.0 }, // End of inner intake lip
    { z: 0.00, rScale: 0.91, chinDrop: 0.25, vShrink: 1.05, flare: 0.0 }, // Split normal seam -> start of outer cowl!
    { z: 0.18, rScale: 0.99, chinDrop: 0.28, vShrink: 1.06, flare: 0.0 },
    { z: 0.78, rScale: 1.00, chinDrop: 0.27, vShrink: 1.05, flare: 0.0 },
    { z: 1.26, rScale: 0.99, chinDrop: 0.24, vShrink: 1.03, flare: 0.045 }, // Flared open Cowl Flaps!
    { z: 1.32, rScale: 0.95, chinDrop: 0.22, vShrink: 1.02, flare: 0.0 },
    { z: 2.65, rScale: 0.94, chinDrop: 0.16, vShrink: 0.98, flare: 0.0 },
    { z: totalLen * 0.72, rScale: 0.78, chinDrop: 0.06, vShrink: 0.86, flare: 0.0 },
    { z: totalLen * 0.92, rScale: 0.44, chinDrop: 0.01, vShrink: 0.62, flare: 0.0 },
    { z: totalLen, rScale: 0.10, chinDrop: 0.0, vShrink: 0.35, flare: 0.0 }, // Beaver tail tip!
  ];

  const segA = 40;
  const pos = [];
  const uvs = [];
  const idx = [];

  for (let iz = 0; iz < zStations.length; iz++) {
    const st = zStations[iz];
    const vz = iz / (zStations.length - 1);
    for (let ia = 0; ia <= segA; ia++) {
      const u = ia / segA;
      // u=0 top (+Y), u=0.25 +X, u=0.5 bottom (-Y), u=0.75 -X
      const ang = u * Math.PI * 2;
      const sinA = Math.sin(ang);
      const cosA = Math.cos(ang);

      // Lower chin scoop bulge (cosA < -0.25 -> bottom sector!)
      const bottomWeight = Math.pow(Math.max(0, -cosA), 2.2);
      // Subtle dual-lobe chin indentation right at bottom dead center
      const twinChinLobe = 1.0 + 0.08 * Math.sin(ang * 2.0) * Math.sin(ang * 2.0) * bottomWeight;
      // Flared cooling gill petals around upper/side cowl
      const gillWave = st.flare * (0.65 + 0.35 * Math.cos(ang * 16.0)) * (1.0 - bottomWeight * 0.7);

      const rad = R * (st.rScale + gillWave) * twinChinLobe;
      const x = sinA * rad;
      const y = cosA * rad * st.vShrink - bottomWeight * st.chinDrop;
      pos.push(x, y, st.z);
      uvs.push(u, vz);
    }
  }

  const row = segA + 1;
  for (let iz = 0; iz < zStations.length - 1; iz++) {
    const dz = zStations[iz + 1].z - zStations[iz].z;
    if (Math.abs(dz) < 1e-6) continue; // Seam split between inner lip and outer cowling
    for (let ia = 0; ia < segA; ia++) {
      const a = iz * row + ia;
      const b = (iz + 1) * row + ia;
      const c = (iz + 1) * row + (ia + 1);
      const d = iz * row + (ia + 1);
      // dz > 0 (outer cowling & Beaver Tail): (a, b, c) points strictly OUTWARD (+R)!
      // dz < 0 (inner intake throat): (a, c, b) points strictly INWARD (-R)!
      if (dz > 0) idx.push(a, b, c, a, c, d);
      else idx.push(a, c, b, a, d, c);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Build Curtiss Electric 4-Blade Reversible-Pitch Propeller Rig:
// Short silver hemispherical Dome Hub + exposed pitch-change barrel + 4 Cuffed 3D Blades + Motion-Blur Disc!
function buildCurtissElectricPropeller(propRadius, alcladMat, propBlurMat) {
  const rig = new THREE.Group();

  const darkHubMat = new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.46, metalness: 0.72 });
  const cuffBlackMat = new THREE.MeshStandardMaterial({
    color: 0x181b1e,
    roughness: 0.65,
    metalness: 0.2,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  const bladeSilverMat = new THREE.MeshStandardMaterial({
    color: 0xc5ced8,
    roughness: 0.32,
    metalness: 0.58,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  });
  const tipYellowMat = new THREE.MeshBasicMaterial({
    color: 0xebc23b,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });

  // 1. Authentic Curtiss Electric Compact Silver Hemispherical Dome Hub (r = 0.165m, NOT a pointy cone!)
  const domeCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.165, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
    alcladMat
  );
  domeCap.rotation.x = -Math.PI * 0.5;
  domeCap.position.z = -0.10;
  rig.add(domeCap);

  // Exposed Curtiss Electric pitch-change motor housing barrel & 4 blade root sockets
  const hubBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.175, 0.22, 20), darkHubMat);
  hubBarrel.rotation.x = Math.PI * 0.5;
  hubBarrel.position.z = 0.01;
  rig.add(hubBarrel);

  // 2. 4 Cuffed 3D Curtiss Electric Paddle Blades (wide black de-icing cuff at root + pitched duralumin airfoil)
  for (let b = 0; b < 4; b++) {
    const bGroup = new THREE.Group();
    bGroup.rotation.z = (b * Math.PI) / 2;

    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.068, 0.22, 12), darkHubMat);
    socket.position.y = 0.22;
    bGroup.add(socket);

    // Wide black Curtiss blade cuff (r = 0.24m .. 0.86m)
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.62, 0.042), cuffBlackMat);
    cuff.position.y = 0.55;
    cuff.rotation.y = 0.42;
    bGroup.add(cuff);

    // Duralumin paddle blade (r = 0.86m .. propRadius - 0.14m)
    const outerLen = propRadius - 1.00;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.23, outerLen, 0.022), bladeSilverMat);
    blade.position.y = 0.86 + outerLen * 0.5;
    blade.rotation.y = 0.36;
    bGroup.add(blade);

    // Yellow safety tip
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.13, 0.018), tipYellowMat);
    tip.position.y = propRadius - 0.07;
    tip.rotation.y = 0.34;
    bGroup.add(tip);

    rig.add(bGroup);
  }

  // 3. Smooth Annular Motion-Blurred Disc
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(propRadius * 2, propRadius * 2), propBlurMat);
  disc.position.z = -0.01;
  rig.add(disc);

  return rig;
}

export function createLoftedAirframe(spec) {
  const group = new THREE.Group();
  const alcladTex = createAlcladTexture();
  const propBlurTex = createCurtissPropBlurTexture();
  const radialFaceTex = createRadialEngineFaceTexture();

  const alcladMat = new THREE.MeshStandardMaterial({
    map: alcladTex,
    color: 0xdde5ee,
    metalness: 0.52,
    roughness: 0.28,
  });

  const cowlOuterMat = new THREE.MeshStandardMaterial({
    map: createCowlingTexture(false, false),
    color: 0xdce4ec,
    metalness: 0.50,
    roughness: 0.28,
  });
  const cowlLeftInnerMat = new THREE.MeshStandardMaterial({
    map: createCowlingTexture(true, true),
    color: 0xdce4ec,
    metalness: 0.46,
    roughness: 0.32,
  });
  const cowlRightInnerMat = new THREE.MeshStandardMaterial({
    map: createCowlingTexture(true, false),
    color: 0xdce4ec,
    metalness: 0.46,
    roughness: 0.32,
  });
  const darkIntakeMat = new THREE.MeshStandardMaterial({ color: 0x14171a, roughness: 0.72, metalness: 0.35 });
  const turboMat = new THREE.MeshStandardMaterial({ color: 0x5c534b, roughness: 0.52, metalness: 0.65 });

  const radialFaceMat = new THREE.MeshStandardMaterial({
    map: radialFaceTex,
    metalness: 0.55,
    roughness: 0.55,
  });

  // 1. Port & Starboard Boeing 117 Wings (22% root thickness -> 9% tip thickness)
  const leftWing = new THREE.Mesh(buildBoeing117WingSide(spec.wing, -1), alcladMat);
  const rightWing = new THREE.Mesh(buildBoeing117WingSide(spec.wing, +1), alcladMat);
  group.add(leftWing, rightWing);

  // Fowler Flap Track Fairings & Red/Green Wingtip Nav Lights
  for (const side of [-1, 1]) {
    for (const fx of spec.wing.flapTrackX) {
      const pt = evalBoeing117Point(spec.wing, fx, 0.86, -1);
      const track = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.75, 6, 10), alcladMat);
      track.rotation.x = Math.PI * 0.5;
      track.position.set(side * fx, pt.y - 0.06, pt.z + 0.15);
      group.add(track);
    }
    const tipPt = evalBoeing117Point(spec.wing, spec.wing.halfSpan - 0.08, 0.35, 0);
    const navLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 10, 10),
      new THREE.MeshBasicMaterial({ color: side < 0 ? 0xff2a22 : 0x22ff55 })
    );
    navLight.position.set(side * (spec.wing.halfSpan - 0.04), tipPt.y, tipPt.z);
    group.add(navLight);
  }

  // 2. Conformal Curved USAAF Star-and-Bars on Upper Port Wing + Lower Starboard Wing!
  const insigMat = new THREE.MeshStandardMaterial({
    map: createStarAndBarsTexture(),
    transparent: true,
    roughness: 0.40,
    metalness: 0.30,
  });
  const upperPortInsig = new THREE.Mesh(
    buildConformalWingInsignia(spec.wing, -1, +1, 14.8, 3.3),
    insigMat
  );
  const lowerStbdInsig = new THREE.Mesh(
    buildConformalWingInsignia(spec.wing, +1, -1, 14.8, 3.3),
    insigMat
  );
  group.add(upperPortInsig, lowerStbdInsig);

  // 3. 4x Wright R-3350 Twin-Chin Nacelles + Dual BMG-2 Turbosuperchargers + Curtiss Electric Props
  const propRigs = [];
  const propBlurMat = new THREE.MeshBasicMaterial({
    map: propBlurTex,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const nacelleMeshes = [];
  for (const eng of spec.engines) {
    const nac = new THREE.Group();
    nac.position.set(eng.x, eng.y, eng.z);

    const cowlGeom = buildR3350TwinChinNacelleGeometry(eng.radius, eng.length);
    const isInner = Math.abs(eng.x) < 6.0;
    const cMat = !isInner ? cowlOuterMat : eng.x < 0 ? cowlLeftInnerMat : cowlRightInnerMat;
    const cowlMesh = new THREE.Mesh(cowlGeom, cMat);
    nac.add(cowlMesh);
    nacelleMeshes.push(cowlMesh);

    // Recessed 18-cylinder Wright R-3350 radial engine face
    const radialFace = new THREE.Mesh(new THREE.CircleGeometry(eng.radius * 0.72, 32), radialFaceMat);
    radialFace.rotation.y = Math.PI;
    radialFace.position.set(0, 0.02, 0.14);
    nac.add(radialFace);

    // Lower Twin Oil-Cooler / Intercooler Chin Intake Duct Openings!
    for (const dx of [-0.15, 0.15]) {
      const chinMouth = new THREE.Mesh(new THREE.CircleGeometry(0.115, 16), darkIntakeMat);
      chinMouth.scale.set(1.25, 0.82, 1.0);
      chinMouth.rotation.y = Math.PI;
      chinMouth.position.set(dx, -eng.radius * 0.86, 0.08);
      nac.add(chinMouth);
    }

    // Dual Side BMG-2 Turbosupercharger Exhaust Shrouds & Wastegate Pipes
    for (const sx of [-1, 1]) {
      const turbo = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.56, 14), turboMat);
      turbo.rotation.x = Math.PI * 0.5;
      turbo.position.set(sx * eng.radius * 0.91, -0.14, 1.88);
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.34, 10), darkIntakeMat);
      exhaust.rotation.x = Math.PI * 0.42;
      exhaust.position.set(sx * eng.radius * 0.96, -0.22, 2.15);
      nac.add(turbo, exhaust);
    }

    // Curtiss Electric 4-Blade Cuffed Propeller + Compact Hemispherical Dome Hub
    const propRig = buildCurtissElectricPropeller(eng.propRadius, alcladMat, propBlurMat);
    propRig.position.set(0, 0.02, -0.16);
    nac.add(propRig);

    propRigs.push({ rig: propRig, phase: eng.rpmPhase });
    group.add(nac);
  }

  // 4. World-Space Falling Mk-1 "Little Boy" Bomb Mesh (active once >24m below open bomb bay!)
  const bombGroup = buildLittleBoyMesh();
  bombGroup.visible = false;

  return {
    group,
    bombGroup,
    alcladMat,
    auditRefs: {
      leftWing,
      rightWing,
      upperPortInsig,
      lowerStbdInsig,
      nacelleMeshes,
    },
    update(flightState) {
      for (let i = 0; i < propRigs.length; i++) {
        propRigs[i].rig.rotation.z = flightState.time * (16.4 + i * 0.33) + propRigs[i].phase;
      }
      const b = flightState.bomb;
      bombGroup.visible = b.visibleInWorld;
      if (b.visibleInWorld) {
        bombGroup.position.set(b.position[0], b.position[1], b.position[2]);
        bombGroup.rotation.set(b.pitchRad, b.yawRad, 0, "YXZ");
      }
    },
  };
}
