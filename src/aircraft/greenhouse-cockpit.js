import * as THREE from "../../vendor/three.module.js";

// Authentic 1:1 Boeing B-29-45-MO ("Enola Gay") Stepless Greenhouse Nose & Pressurized Flight Deck
// - Stamped/Extruded Riveted Aluminum U-Channel Window Mullions + Rubber Glazing Gaskets + Corner Gussets (ZERO garden-hose cylinders!)
// - Chord-Flat Trapezoidal Pilot & Copilot Laminated Safety-Glass Main Windshields
// - Contoured Wall-to-Wall Black Wrinkle-Paint Instrument Bulkhead + Rolled-Leather Glare-Shield Coaming (ZERO floating boxes!)
// - Sculpted Central Aisle-Stand Quadrant Pedestal (4 R-3350 Throttles, 4 Mixture, 4 Prop/Turbo Levers + Spoked Trim Wheel)
// - Center-Post B-16 Wet Standby Compass, Sculpted Norden M-9 Bombsight & Curved Armored Bucket Seats

function createQuiltedPaddingTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#2b3325";
  ctx.fillRect(0, 0, 512, 512);

  // Subtle fabric weave + tufted diamond quilting with button dimples
  for (let y = 0; y < 512; y += 64) {
    for (let x = 0; x < 512; x += 64) {
      const grd = ctx.createRadialGradient(x + 32, y + 32, 4, x + 32, y + 32, 44);
      grd.addColorStop(0.0, "rgba(58, 68, 50, 0.55)");
      grd.addColorStop(1.0, "rgba(22, 27, 19, 0.45)");
      ctx.fillStyle = grd;
      ctx.fillRect(x, y, 64, 64);
    }
  }
  ctx.strokeStyle = "#171c14";
  ctx.lineWidth = 3.0;
  for (let i = -512; i < 1024; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 512, 512);
    ctx.moveTo(i + 512, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 512x512 Riveted USAAF Interior Bronze-Green Stamped Sheet-Metal Albedo + Bump Maps
function createRivetedFrameMaps() {
  const c = document.createElement("canvas");
  const b = document.createElement("canvas");
  c.width = b.width = 512;
  c.height = b.height = 128;
  const ctx = c.getContext("2d");
  const bctx = b.getContext("2d");

  // USAAF Dull Dark Green / Interior Bronze Green (#2c3628) with subtle brushed aluminum wear on flanges
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0.0, "#3d4938");
  grad.addColorStop(0.14, "#2d3729");
  grad.addColorStop(0.50, "#262f23");
  grad.addColorStop(0.86, "#2d3729");
  grad.addColorStop(1.0, "#434f3e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 128);

  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, 512, 128);

  // Sheet-metal panel lap seam at x = 256
  ctx.strokeStyle = "rgba(16, 20, 15, 0.7)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 128);
  ctx.stroke();
  bctx.strokeStyle = "#484848";
  bctx.lineWidth = 3;
  bctx.beginPath();
  bctx.moveTo(256, 0);
  bctx.lineTo(256, 128);
  bctx.stroke();

  // Double rows of raised AN470 brazier-head rivets along top & bottom channel flanges!
  for (const ry of [20, 108]) {
    for (let rx = 14; rx < 512; rx += 28) {
      // Albedo rivet head + subtle silver glint
      ctx.fillStyle = "#1c231a";
      ctx.beginPath();
      ctx.arc(rx + 1, ry + 1, 4.6, 0, Math.PI * 2);
      ctx.fill();

      const rg = ctx.createRadialGradient(rx - 1.2, ry - 1.2, 0.5, rx, ry, 4.2);
      rg.addColorStop(0.0, "#5d6b57");
      rg.addColorStop(0.65, "#313b2d");
      rg.addColorStop(1.0, "#21281e");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(rx, ry, 4.2, 0, Math.PI * 2);
      ctx.fill();

      // Bump map hemisphere for crisp 3D rivet normal highlight!
      const bg = bctx.createRadialGradient(rx, ry, 0.5, rx, ry, 4.8);
      bg.addColorStop(0.0, "#ffffff");
      bg.addColorStop(0.7, "#b8b8b8");
      bg.addColorStop(1.0, "#808080");
      bctx.fillStyle = bg;
      bctx.beginPath();
      bctx.arc(rx, ry, 4.8, 0, Math.PI * 2);
      bctx.fill();
    }
  }

  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(b);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = 8;

  return { map, bumpMap };
}

// 512x512 Authentic WWII USAAF Black Wrinkle-Finish Enamel ("Wrinkle Paint") + Nomenclature Placard Texture
function createWrinklePaintMaps() {
  const c = document.createElement("canvas");
  const b = document.createElement("canvas");
  c.width = b.width = 512;
  c.height = b.height = 512;
  const ctx = c.getContext("2d");
  const bctx = b.getContext("2d");

  ctx.fillStyle = "#16191c";
  ctx.fillRect(0, 0, 512, 512);
  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, 512, 512);

  // Fine crystalline crinkle/wrinkle enamel micro-texture
  for (let i = 0; i < 24000; i++) {
    const px = ((Math.sin(i * 19.173) * 43758.5453) % 1 + 1) % 1 * 512;
    const py = ((Math.sin(i * 91.713) * 19843.2311) % 1 + 1) % 1 * 512;
    const v = i % 2 === 0 ? 28 : 16;
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
    ctx.fillRect(px, py, 2.0, 1.5);

    const bv = i % 2 === 0 ? 156 : 102;
    bctx.fillStyle = `rgb(${bv},${bv},${bv})`;
    bctx.fillRect(px, py, 2.0, 1.5);
  }

  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 2);
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(b);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 2);

  return { map, bumpMap };
}

function createPlacardTexture(lines, borderCol = "#c8d0d8", bgCol = "#121518") {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bgCol;
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 4;
  ctx.strokeRect(5, 5, 246, 86);

  ctx.fillStyle = "#dde4ec";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((ln, idx) => {
    ctx.font = `bold ${idx === 0 ? 20 : 15}px "Arial Narrow", Arial, sans-serif`;
    const y = lines.length === 1 ? 48 : 30 + idx * 24;
    ctx.fillText(ln, 128, y);
  });
  // 4 corner rivet dots
  for (const [rx, ry] of [[14, 14], [242, 14], [14, 82], [242, 82]]) {
    ctx.beginPath();
    ctx.arc(rx, ry, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Build an Oriented Beveled Stamped-Aluminum Channel Mullion + Black Rubber Weatherstrip Lip (ZERO round cylinders!)
const _vAxis = new THREE.Vector3();
const _vNorm = new THREE.Vector3();
const _vBinorm = new THREE.Vector3();
const _mMullion = new THREE.Matrix4();

function addExtrudedChannelMullion(group, pA, pB, nA, nB, faceW, webD, frameMat, rubberMat) {
  _vAxis.subVectors(pB, pA);
  const len = _vAxis.length();
  if (len < 1e-4) return;
  _vAxis.divideScalar(len); // Y axis along strut

  // Outward surface normal averaged & orthonormalized perpendicular to strut axis
  _vNorm.addVectors(nA, nB).multiplyScalar(0.5);
  _vNorm.addScaledVector(_vAxis, -_vNorm.dot(_vAxis));
  if (_vNorm.lengthSq() < 1e-6) _vNorm.set(0, 1, 0);
  _vNorm.normalize(); // Z axis = strictly OUTWARD normal of fuselage glass!

  _vBinorm.crossVectors(_vAxis, _vNorm).normalize(); // X axis = tangent width across glass!

  // Cross-section in (X = tangent width, Z = radial depth: +0.004 outer cap down to -webD inner channel!)
  const hw = faceW * 0.5;
  const iw = faceW * 0.38;
  const profile = [
    [-hw, 0.003],
    [hw, 0.003],
    [hw, -0.004],
    [iw, -0.009],
    [iw, -webD + 0.004],
    [iw - 0.004, -webD],
    [-iw + 0.004, -webD],
    [-iw, -webD + 0.004],
    [-iw, -0.009],
    [-hw, -0.004],
  ];

  const nP = profile.length;
  const pos = [];
  const uvs = [];
  const idx = [];
  const uRep = Math.max(1.0, len / 0.18);

  for (let end = 0; end <= 1; end++) {
    const y = (end - 0.5) * len;
    for (let k = 0; k <= nP; k++) {
      const [px, pz] = profile[k % nP];
      pos.push(px, y, pz);
      uvs.push(end * uRep, k / nP);
    }
  }
  const row = nP + 1;
  for (let k = 0; k < nP; k++) {
    const a = k;
    const b = row + k;
    const c = row + k + 1;
    const d = k + 1;
    // Profile goes clockwise in (X, Z): (-hw, +0.003) -> (+hw, +0.003) (+X), end goes -len/2 -> +len/2 (+Y):
    // dP/dk = (+X), dP/dend = (+Y) -> (+X) x (+Y) = +Z (outward!), so (a, d, c, b) -> (a, d, c) & (a, c, b)!
    idx.push(a, d, c, a, c, b);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(idx);
  geom.computeVertexNormals();

  _mMullion.makeBasis(_vBinorm, _vAxis, _vNorm);
  const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
  _mMullion.setPosition(mid);

  const mesh = new THREE.Mesh(geom, frameMat);
  mesh.applyMatrix4(_mMullion);
  group.add(mesh);

  // Black EPDM rubber weatherstrip gasket lip framing both edges of glass pane!
  if (rubberMat) {
    const gasket = new THREE.Mesh(new THREE.BoxGeometry(faceW + 0.011, len, 0.0045), rubberMat);
    gasket.applyMatrix4(_mMullion);
    group.add(gasket);
  }
}

// Stamped Octagonal Riveted Corner Gusset Plate at Frame Intersections
function addCornerGusset(group, pt, normalVec, radius, frameMat) {
  const g = new THREE.CylinderGeometry(radius, radius * 1.06, 0.006, 8);
  const m = new THREE.Mesh(g, frameMat);
  const n = normalVec.clone().normalize();
  m.position.copy(pt).addScaledVector(n, -0.018);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  group.add(m);
}

// Loft cylindrical/conical fuselage arc shell (outwardWinding=false for interior liner, true for exterior Alclad!)
function buildLoftedArcShell(stations, maxStationIdx, startDeg, spanDeg, rScale, outwardWinding) {
  const arcSegs = 28;
  const positions = [];
  const uvs = [];
  const indices = [];

  const startAng = (startDeg * Math.PI) / 180;
  const spanAng = (spanDeg * Math.PI) / 180;

  for (let s = 0; s <= maxStationIdx; s++) {
    const st = stations[s];
    const r = st.r * rScale;
    for (let j = 0; j <= arcSegs; j++) {
      const u = j / arcSegs;
      const ang = startAng + u * spanAng;
      const x = Math.sin(ang) * r;
      const y = st.cy + Math.cos(ang) * r;
      positions.push(x, y, st.z);
      uvs.push(u, s / Math.max(1, maxStationIdx));
    }
  }

  const row = arcSegs + 1;
  for (let s = 0; s < maxStationIdx; s++) {
    for (let j = 0; j < arcSegs; j++) {
      const a = s * row + j;
      const b = (s + 1) * row + j;
      const c = (s + 1) * row + (j + 1);
      const d = s * row + (j + 1);
      if (outwardWinding) {
        indices.push(a, c, b, a, d, c);
      } else {
        indices.push(a, b, c, a, c, d);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

export function createGreenhouseCockpit(spec, alcladMat) {
  const group = new THREE.Group();
  const ck = spec.cockpit;

  const rivetMaps = createRivetedFrameMaps();
  const frameMat = new THREE.MeshStandardMaterial({
    map: rivetMaps.map,
    bumpMap: rivetMaps.bumpMap,
    bumpScale: 0.0032,
    roughness: 0.48,
    metalness: 0.58,
  });

  const rubberGasketMat = new THREE.MeshStandardMaterial({
    color: 0x121416,
    roughness: 0.88,
    metalness: 0.04,
  });

  const wrinkleMaps = createWrinklePaintMaps();
  const wrinklePanelMat = new THREE.MeshStandardMaterial({
    map: wrinkleMaps.map,
    bumpMap: wrinkleMaps.bumpMap,
    bumpScale: 0.0024,
    roughness: 0.76,
    metalness: 0.24,
    envMapIntensity: 0.25,
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1a1f22,
    roughness: 0.48,
    metalness: 0.68,
    envMapIntensity: 0.45,
  });

  const brushedSteelMat = new THREE.MeshStandardMaterial({
    color: 0xc4cdd6,
    roughness: 0.28,
    metalness: 0.88,
  });

  const leatherCoamingMat = new THREE.MeshStandardMaterial({
    color: 0x1d1a17,
    bumpMap: wrinkleMaps.bumpMap,
    bumpScale: 0.0018,
    roughness: 0.72,
    metalness: 0.05,
  });

  const cushionCanvasMat = new THREE.MeshStandardMaterial({
    color: 0x5c583e,
    roughness: 0.90,
    metalness: 0.02,
  });

  const quiltTex = createQuiltedPaddingTexture();
  const quiltInnerMat = new THREE.MeshStandardMaterial({
    map: quiltTex,
    bumpMap: quiltTex,
    bumpScale: 0.004,
    roughness: 0.88,
    metalness: 0.04,
    side: THREE.FrontSide,
  });
  const quiltMat = new THREE.MeshStandardMaterial({
    map: quiltTex,
    bumpMap: quiltTex,
    bumpScale: 0.004,
    roughness: 0.88,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });

  const canopyGlassMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      out vec3 vNrm;
      out vec3 vView;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vNrm = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      precision highp float;
      in vec3 vNrm;
      in vec3 vView;
      out vec4 fragColor;
      void main() {
        float ndotv = abs(dot(normalize(vNrm), normalize(vView)));
        float fresnel = pow(1.0 - ndotv, 4.2);
        fragColor = vec4(vec3(0.78, 0.89, 0.96), 0.012 + 0.085 * fresnel);
      }
    `,
  });

  // 1. AUTHENTIC BOEING B-29 RIVETED STAMPED-CHANNEL GREENHOUSE FRAMEWORK + CHORD-FLAT MAIN WINDSHIELDS
  const stations = ck.noseStations;
  const anglesDeg = ck.meridianAnglesDeg; // [-144, -92, -60, -32, 0, 32, 60, 92, 144]
  const anglesRad = anglesDeg.map((d) => (d * Math.PI) / 180);

  const stationPt = (sIdx, angRad) => {
    const st = stations[sIdx];
    return new THREE.Vector3(Math.sin(angRad) * st.r, st.cy + Math.cos(angRad) * st.r, st.z);
  };
  const stationNrm = (angRad) => new THREE.Vector3(Math.sin(angRad), Math.cos(angRad), -0.15).normalize();

  // Circumferential / Chord-Straight Frame Mullions at each station!
  // Across the upper glazing (-92°..+92°), connect adjacent meridian posts with STRAIGHT CHORD MULLIONS
  // so the Pilot & Copilot main windshields (-32°..0°..+32°) and quarter windows are true flat-pane trapezoids!
  for (let s = 0; s < stations.length; s++) {
    const isHeavyRing = s === 0 || s === 1 || s === 2;
    const faceW = isHeavyRing ? 0.044 : 0.032;
    const webD = isHeavyRing ? 0.030 : 0.022;

    // Upper glazed chord segments between meridian posts (-144° .. +144°)
    for (let m = 0; m < anglesRad.length - 1; m++) {
      const a0 = anglesRad[m];
      const a1 = anglesRad[m + 1];
      // At forward nose cap stations (s >= 5), merge small panes cleanly so nose tip isn't cluttered
      if (s === stations.length - 1) continue;
      const p0 = stationPt(s, a0);
      const p1 = stationPt(s, a1);
      addExtrudedChannelMullion(group, p0, p1, stationNrm(a0), stationNrm(a1), faceW, webD, frameMat, rubberGasketMat);
    }

    // Lower chin arc (+144° -> +180° -> -144°): keep Bombardier Norden sighting window (s === 4, 5) 100% unobstructed!
    if (s <= 3) {
      const chinSteps = 6;
      for (let k = 0; k < chinSteps; k++) {
        const a0 = (144 + (k / chinSteps) * 72) * (Math.PI / 180);
        const a1 = (144 + ((k + 1) / chinSteps) * 72) * (Math.PI / 180);
        addExtrudedChannelMullion(
          group,
          stationPt(s, a0),
          stationPt(s, a1),
          stationNrm(a0),
          stationNrm(a1),
          faceW,
          webD,
          frameMat,
          null
        );
      }
    }
  }

  // Longitudinal Meridian Channel Ribs + Stamped Corner Gusset Plates!
  for (let m = 0; m < anglesRad.length; m++) {
    const ang = anglesRad[m];
    const deg = Math.abs(anglesDeg[m]);
    const isCenterPost = deg === 0;
    const isSill = deg === 92;
    for (let s = 0; s < stations.length - 1; s++) {
      // Center 0° post terminates cleanly at top of Bombardier's optical nose cap (s === 4 -> z = -5.02m)!
      if (isCenterPost && s >= 4) continue;
      if (isSill && s >= 5) continue;

      const p0 = stationPt(s, ang);
      const p1 = stationPt(s + 1, ang);
      const n = stationNrm(ang);
      const faceW = isCenterPost ? 0.044 : isSill ? 0.048 : 0.034;
      const webD = isCenterPost ? 0.030 : isSill ? 0.034 : 0.024;
      addExtrudedChannelMullion(group, p0, p1, n, n, faceW, webD, frameMat, rubberGasketMat);

      if (s >= 1 && s <= 4 && deg <= 92) {
        addCornerGusset(group, p0, n, isCenterPost ? 0.038 : 0.030, frameMat);
      }
    }
  }

  // Bombardier's Elliptical Optically-Flat Nose Glass Frame at drooped nose tip (y = -0.35m, z = -5.63m)
  const noseBezelPts = [];
  const noseSegs = 28;
  for (let i = 0; i <= noseSegs; i++) {
    const a = (i / noseSegs) * Math.PI * 2;
    noseBezelPts.push(new THREE.Vector3(Math.sin(a) * 0.31, -0.35 + Math.cos(a) * 0.27, -5.63));
  }
  for (let i = 0; i < noseSegs; i++) {
    const n = new THREE.Vector3(noseBezelPts[i].x, noseBezelPts[i].y + 0.35, -0.5).normalize();
    addExtrudedChannelMullion(group, noseBezelPts[i], noseBezelPts[i + 1], n, n, 0.032, 0.022, frameMat, rubberGasketMat);
  }

  // Clean Grazing-Angle Fresnel Canopy Glass Shell following exact drooped station centers!
  const gPos = [];
  const gUvs = [];
  const gIdx = [];
  const gArc = 40;
  for (let s = 0; s < stations.length; s++) {
    const st = stations[s];
    const r = st.r * 0.996;
    for (let j = 0; j <= gArc; j++) {
      const u = j / gArc;
      const a = u * Math.PI * 2;
      gPos.push(Math.sin(a) * r, st.cy + Math.cos(a) * r, st.z);
      gUvs.push(u, s / (stations.length - 1));
    }
  }
  const gRow = gArc + 1;
  for (let s = 0; s < stations.length - 1; s++) {
    for (let j = 0; j < gArc; j++) {
      const a = s * gRow + j;
      const b = (s + 1) * gRow + j;
      const c = (s + 1) * gRow + (j + 1);
      const d = s * gRow + (j + 1);
      gIdx.push(a, c, b, a, d, c);
    }
  }
  const glassGeom = new THREE.BufferGeometry();
  glassGeom.setAttribute("position", new THREE.Float32BufferAttribute(gPos, 3));
  glassGeom.setAttribute("uv", new THREE.Float32BufferAttribute(gUvs, 2));
  glassGeom.setIndex(gIdx);
  glassGeom.computeVertexNormals();
  group.add(new THREE.Mesh(glassGeom, canopyGlassMat));

  // 2. LOFTED QUILTED CABIN LINER (INWARD) + SILVER ALCLAD FORWARD SKIN (OUTWARD)
  const lowerCabinWall = new THREE.Mesh(
    buildLoftedArcShell(stations, 4, 92, 176, 0.986, false),
    quiltInnerMat
  );
  group.add(lowerCabinWall);

  let extLowerNoseSkin = null;
  let extUpperRoofSkin = null;
  if (alcladMat) {
    extLowerNoseSkin = new THREE.Mesh(
      buildLoftedArcShell(stations, 4, 90, 180, 1.004, true),
      alcladMat
    );
    extUpperRoofSkin = new THREE.Mesh(
      buildLoftedArcShell(stations, 2, -48, 96, 1.004, true),
      alcladMat
    );
    group.add(extLowerNoseSkin, extUpperRoofSkin);
  }

  // Ribbed Non-Slip Cabin Deck Floor + Forward Nose Tunnel Floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.06, 3.45), darkMetalMat);
  floor.position.set(0, -0.68, -3.15);
  const noseFloor = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.05, 1.45), darkMetalMat);
  noseFloor.position.set(0, -0.82, -4.75);
  group.add(floor, noseFloor);

  const aftBulkhead = new THREE.Mesh(new THREE.CircleGeometry(1.46, 36), quiltMat);
  aftBulkhead.position.set(0, 0, ck.aftBulkheadZ);
  group.add(aftBulkhead);

  // Starboard Upper Pressurized Crawl-Tunnel Hatch Door
  const tunnelHatchRing = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.026, 12, 28), frameMat);
  tunnelHatchRing.position.set(0.62, 0.72, ck.aftBulkheadZ - 0.015);
  const tunnelHatchDoor = new THREE.Mesh(new THREE.CircleGeometry(0.34, 28), darkMetalMat);
  tunnelHatchDoor.rotation.y = Math.PI;
  tunnelHatchDoor.position.set(0.62, 0.72, ck.aftBulkheadZ - 0.012);
  group.add(tunnelHatchRing, tunnelHatchDoor);

  // 3. CONTOURED WALL-TO-WALL BOEING B-29 INSTRUMENT BULKHEAD & ROLLED-LEATHER GLARE SHIELD!
  // Replaces floating gray rectangles with a continuous sculpted aircraft bulkhead hugging R=1.28m cabin walls!
  const dashShape = new THREE.Shape();
  dashShape.moveTo(-1.24, -0.06);
  dashShape.quadraticCurveTo(-1.05, 0.145, -0.82, 0.148);
  dashShape.lineTo(-0.20, 0.148);
  // Central step-down bridge over forward bombardier tunnel sightline!
  dashShape.quadraticCurveTo(-0.15, 0.148, -0.13, 0.045);
  dashShape.lineTo(0.13, 0.045);
  dashShape.quadraticCurveTo(0.15, 0.148, 0.20, 0.148);
  dashShape.lineTo(0.82, 0.148);
  dashShape.quadraticCurveTo(1.05, 0.145, 1.24, -0.06);
  // Curved lower fuselage wall embrace + sculpted pilot/copilot knee arches!
  dashShape.quadraticCurveTo(1.18, -0.44, 0.96, -0.64);
  dashShape.lineTo(0.82, -0.64);
  dashShape.quadraticCurveTo(0.76, -0.35, 0.56, -0.34);
  dashShape.quadraticCurveTo(0.36, -0.35, 0.30, -0.64);
  dashShape.lineTo(0.16, -0.64);
  // Central bombardier crawlway arch under C-1 autopilot bridge
  dashShape.lineTo(0.14, -0.14);
  dashShape.lineTo(-0.14, -0.14);
  dashShape.lineTo(-0.16, -0.64);
  dashShape.lineTo(-0.30, -0.64);
  dashShape.quadraticCurveTo(-0.36, -0.35, -0.56, -0.34);
  dashShape.quadraticCurveTo(-0.76, -0.35, -0.82, -0.64);
  dashShape.lineTo(-0.96, -0.64);
  dashShape.quadraticCurveTo(-1.18, -0.44, -1.24, -0.06);

  const dashGeom = new THREE.ExtrudeGeometry(dashShape, {
    depth: 0.065,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.007,
    bevelSegments: 3,
    UVGenerator: {
      generateTopUV: (_geom, vertices, idxA, idxB, idxC) => [
        new THREE.Vector2(vertices[idxA * 3] * 0.8, vertices[idxA * 3 + 1] * 0.8),
        new THREE.Vector2(vertices[idxB * 3] * 0.8, vertices[idxB * 3 + 1] * 0.8),
        new THREE.Vector2(vertices[idxC * 3] * 0.8, vertices[idxC * 3 + 1] * 0.8),
      ],
      generateSideWallUV: (_geom, vertices, idxA, idxB, idxC, idxD) => [
        new THREE.Vector2(vertices[idxA * 3], vertices[idxA * 3 + 2]),
        new THREE.Vector2(vertices[idxB * 3], vertices[idxB * 3 + 2]),
        new THREE.Vector2(vertices[idxC * 3], vertices[idxC * 3 + 2]),
        new THREE.Vector2(vertices[idxD * 3], vertices[idxD * 3 + 2]),
      ],
    },
  });
  const dashMesh = new THREE.Mesh(dashGeom, wrinklePanelMat);
  dashMesh.position.set(0, 0, ck.panelZ - 0.068);
  group.add(dashMesh);

  // Recessed dark shadow backdrop behind rudder/yoke wells so no bright sky leaks under the panel!
  const underDashApron = new THREE.Mesh(
    new THREE.CylinderGeometry(1.26, 1.26, 0.58, 28, 1, true, Math.PI * 0.55, Math.PI * 0.90),
    rubberGasketMat
  );
  underDashApron.rotation.z = Math.PI * 0.5;
  underDashApron.rotation.y = Math.PI * 0.5;
  underDashApron.position.set(0, -0.42, ck.panelZ - 0.28);
  group.add(underDashApron);

  // Curved Sheet-Metal Glare-Shield Coaming + Stitched Rolled-Leather Padded Brow Lip!
  for (const side of [-1, 1]) {
    const browPts = [
      new THREE.Vector3(side * 1.18, -0.02, ck.panelZ + 0.015),
      new THREE.Vector3(side * 0.94, 0.148, ck.panelZ + 0.032),
      new THREE.Vector3(side * 0.56, 0.156, ck.panelZ + 0.042),
      new THREE.Vector3(side * 0.21, 0.154, ck.panelZ + 0.032),
      new THREE.Vector3(side * 0.14, 0.055, ck.panelZ + 0.018),
    ];
    const browCurve = new THREE.CatmullRomCurve3(browPts);
    const leatherRoll = new THREE.Mesh(new THREE.TubeGeometry(browCurve, 28, 0.015, 12, false), leatherCoamingMat);
    group.add(leatherRoll);

    // Forward sloping anti-glare sheet-metal hood extending from brow to windshield base
    const hoodPts = [];
    const hPos = [];
    const hIdx = [];
    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      const pFront = browCurve.getPointAt(u);
      const pBack = pFront.clone().add(new THREE.Vector3(0, -0.012, -0.22));
      hPos.push(pFront.x, pFront.y, pFront.z, pBack.x, pBack.y, pBack.z);
    }
    for (let i = 0; i < 20; i++) {
      const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2 + 1, d = (i + 1) * 2;
      if (side < 0) hIdx.push(a, b, c, a, c, d);
      else hIdx.push(a, c, b, a, d, c);
    }
    const hoodGeom = new THREE.BufferGeometry();
    hoodGeom.setAttribute("position", new THREE.Float32BufferAttribute(hPos, 3));
    hoodGeom.setIndex(hIdx);
    hoodGeom.computeVertexNormals();
    group.add(new THREE.Mesh(hoodGeom, darkMetalMat));
  }

  // Engraved USAAF Nomenclature Data Placards + Stainless DZUS Fasteners on Instrument Board!
  const serialPlacard = new THREE.Mesh(
    new THREE.PlaneGeometry(0.13, 0.042),
    new THREE.MeshStandardMaterial({
      map: createPlacardTexture(["U.S. ARMY AIR FORCES", "B-29-45-MO · 44-86292"]),
      roughness: 0.45,
    })
  );
  serialPlacard.position.set(-0.56, 0.108, ck.panelZ + 0.006);
  group.add(serialPlacard);

  const c1Placard = new THREE.Mesh(
    new THREE.PlaneGeometry(0.15, 0.046),
    new THREE.MeshStandardMaterial({
      map: createPlacardTexture(["BOMB BAY / RELEASE", "C-1 AUTOPILOT ENGAGED"], "#d8a848"),
      roughness: 0.45,
    })
  );
  c1Placard.position.set(0.0, -0.055, ck.panelZ + 0.006);
  group.add(c1Placard);

  for (const [sx, sy] of [
    [-0.92, 0.11], [-0.22, 0.11], [-0.92, -0.30], [-0.22, -0.30],
    [0.22, 0.11], [0.92, 0.11], [0.22, -0.30], [0.92, -0.30],
  ]) {
    const dzus = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.004, 12), brushedSteelMat);
    dzus.rotation.x = Math.PI * 0.5;
    dzus.position.set(sx, sy, ck.panelZ + 0.006);
    group.add(dzus);
  }

  // 4. B-16 WET STANDBY MAGNETIC COMPASS MOUNTED ON 0° CENTER WINDSHIELD POST!
  const compassGroup = new THREE.Group();
  compassGroup.position.set(0, 0.46, -4.02);
  const compBody = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.044, 0.068, 20), wrinklePanelMat);
  const compCap = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), darkMetalMat);
  compCap.position.y = 0.034;
  const compWindow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.044, 0.022),
    new THREE.MeshStandardMaterial({
      map: createPlacardTexture(["266° W"], "#e2f0be", "#0d1012"),
      emissive: new THREE.Color(0x527a38),
      emissiveIntensity: 0.4,
    })
  );
  compWindow.position.set(0, 0.004, 0.042);
  const compBracket = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.11, 10), frameMat);
  compBracket.rotation.x = Math.PI * 0.42;
  compBracket.position.set(0, 0.03, -0.055);
  compassGroup.add(compBody, compCap, compWindow, compBracket);
  group.add(compassGroup);

  // 5. SCULPTED NORDEN M-9 BOMBSIGHT GYRO HEAD & STABILIZER IN FORWARD NOSE WELL
  const nordenPedestal = new THREE.Group();
  nordenPedestal.position.set(0.0, -0.52, -4.96);
  const sightBase = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.088, 0.16, 18), frameMat);
  const sightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.052, 0.28, 16), darkMetalMat);
  sightPost.position.y = 0.18;
  const gyroCasing = new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 16), wrinklePanelMat);
  gyroCasing.scale.set(0.92, 1.08, 1.15);
  gyroCasing.position.y = 0.34;
  const telescopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.036, 0.24, 16), darkMetalMat);
  telescopeTube.rotation.x = 0.58;
  telescopeTube.position.set(0, 0.38, -0.08);
  const rubberEyecup = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.007, 10, 18), rubberGasketMat);
  rubberEyecup.rotation.x = 0.58 + Math.PI * 0.5;
  rubberEyecup.position.set(0, 0.47, 0.01);
  nordenPedestal.add(sightBase, sightPost, gyroCasing, telescopeTube, rubberEyecup);
  group.add(nordenPedestal);

  // 6. SCULPTED SHEET-METAL CENTRAL AISLE STAND (R-3350 THROTTLE / MIXTURE / PROP QUADRANT + TRIM WHEEL!)
  const pedGroup = new THREE.Group();
  pedGroup.position.set(0, -0.68, -3.38);

  // Tapered beveled side-profile extrusion for central control pedestal (ZERO raw cube!)
  const pedSide = new THREE.Shape();
  pedSide.moveTo(-0.34, 0.0);
  pedSide.lineTo(0.36, 0.0);
  pedSide.lineTo(0.30, 0.44);
  pedSide.quadraticCurveTo(0.26, 0.50, 0.16, 0.51);
  pedSide.lineTo(-0.18, 0.51);
  pedSide.quadraticCurveTo(-0.28, 0.50, -0.31, 0.42);
  pedSide.closePath();

  const pedBodyGeom = new THREE.ExtrudeGeometry(pedSide, {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.010,
    bevelSize: 0.008,
    bevelSegments: 3,
  });
  pedBodyGeom.rotateY(Math.PI * 0.5);
  const pedBody = new THREE.Mesh(pedBodyGeom, frameMat);
  pedBody.position.x = -0.12;
  pedGroup.add(pedBody);

  // Slotted brushed-steel top quadrant gate plate
  const gateDeck = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.23, 22, 1, false, 0, Math.PI), wrinklePanelMat);
  gateDeck.rotation.z = Math.PI * 0.5;
  gateDeck.scale.set(1.0, 1.0, 1.85);
  gateDeck.position.set(0, 0.49, -0.02);
  pedGroup.add(gateDeck);

  for (let s = 0; s < 8; s++) {
    const slotRail = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.0022, 6, 20, Math.PI * 0.72), brushedSteelMat);
    slotRail.rotation.y = Math.PI * 0.5;
    slotRail.rotation.x = 0.35;
    slotRail.position.set(-0.095 + s * 0.027, 0.49, -0.02);
    pedGroup.add(slotRail);
  }

  // 4 Curved Steel Wright R-3350 Throttle Levers with Turned Ivory-Phenolic Grips!
  const throttleLevers = [];
  const ivoryGripMat = new THREE.MeshStandardMaterial({ color: 0xdad3c2, roughness: 0.34, metalness: 0.05 });
  const redMixMat = new THREE.MeshStandardMaterial({ color: 0xa82e22, roughness: 0.40, metalness: 0.12 });

  for (let i = 0; i < 4; i++) {
    const piv = new THREE.Group();
    piv.position.set(-0.042 + i * 0.028, 0.49, -0.03);

    const shank = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.155, 0.014), brushedSteelMat);
    shank.position.y = 0.078;

    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.026, 16), ivoryGripMat);
    knob.rotation.z = Math.PI * 0.5;
    knob.position.y = 0.155;

    piv.add(shank, knob);
    pedGroup.add(piv);
    throttleLevers.push(piv);

    // Aft-bank Red Mixture Control Levers
    const mixPiv = new THREE.Group();
    mixPiv.position.set(-0.042 + i * 0.028, 0.48, 0.12);
    mixPiv.rotation.x = 0.24;
    const mixShank = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.115, 0.011), brushedSteelMat);
    mixShank.position.y = 0.058;
    const mixKnob = new THREE.Mesh(new THREE.SphereGeometry(0.010, 12, 10), redMixMat);
    mixKnob.scale.set(1.2, 0.85, 1.0);
    mixKnob.position.y = 0.118;
    mixPiv.add(mixShank, mixKnob);
    pedGroup.add(mixPiv);
  }

  // Spoked Cast-Aluminum Elevator Trim Wheel on Captain's side of Pedestal (x = -0.138m)!
  const trimWheelGroup = new THREE.Group();
  trimWheelGroup.position.set(-0.138, 0.36, 0.04);
  const trimRim = new THREE.Mesh(new THREE.TorusGeometry(0.108, 0.011, 12, 32), darkMetalMat);
  trimRim.rotation.y = Math.PI * 0.5;
  trimWheelGroup.add(trimRim);
  for (let k = 0; k < 4; k++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.20, 8), frameMat);
    spoke.rotation.x = (k / 4) * Math.PI;
    trimWheelGroup.add(spoke);
  }
  const trimHub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.018, 16), brushedSteelMat);
  trimHub.rotation.z = Math.PI * 0.5;
  trimWheelGroup.add(trimHub);
  pedGroup.add(trimWheelGroup);

  group.add(pedGroup);

  // 7. CONTOURED USAAF ARMORED PILOT & COPILOT BUCKET SEATS + CANVAS CUSHIONS
  for (const sx of [-0.54, 0.54]) {
    const seatGroup = new THREE.Group();
    seatGroup.position.set(sx, -0.26, -3.06);

    // Curved wrap-around aluminum bucket backrest shell
    const bucketShell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.25, 0.64, 20, 1, true, -Math.PI * 0.42, Math.PI * 0.84),
      frameMat
    );
    bucketShell.rotation.y = Math.PI;
    bucketShell.position.set(0, 0.34, 0.02);
    seatGroup.add(bucketShell);

    // Tufted olive-khaki canvas seat & back cushions
    const panCushion = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), cushionCanvasMat);
    panCushion.scale.set(0.95, 0.22, 0.95);
    panCushion.position.set(0, 0.03, -0.02);

    const backCushion = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 12), cushionCanvasMat);
    backCushion.scale.set(0.90, 1.18, 0.22);
    backCushion.position.set(0, 0.33, 0.19);
    backCushion.rotation.x = -0.08;

    seatGroup.add(panCushion, backCushion);
    group.add(seatGroup);
  }

  // 8. FLOATING SUNLIT COCKPIT DUST MOTES
  const dustCount = 120;
  const dustBase = new Float32Array(dustCount * 3);
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const x = (Math.random() - 0.5) * 1.85;
    const y = -0.20 + Math.random() * 1.1;
    const z = -2.2 - Math.random() * 2.3;
    dustBase[i * 3] = dustPos[i * 3] = x;
    dustBase[i * 3 + 1] = dustPos[i * 3 + 1] = y;
    dustBase[i * 3 + 2] = dustPos[i * 3 + 2] = z;
  }
  const moteCanvas = document.createElement("canvas");
  moteCanvas.width = moteCanvas.height = 32;
  const mctx = moteCanvas.getContext("2d");
  const mgrad = mctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  mgrad.addColorStop(0.0, "rgba(255, 246, 224, 1.0)");
  mgrad.addColorStop(0.45, "rgba(255, 242, 214, 0.45)");
  mgrad.addColorStop(1.0, "rgba(255, 240, 210, 0.0)");
  mctx.fillStyle = mgrad;
  mctx.fillRect(0, 0, 32, 32);
  const moteTex = new THREE.CanvasTexture(moteCanvas);

  const dustGeom = new THREE.BufferGeometry();
  dustGeom.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    map: moteTex,
    color: 0xfff0d4,
    size: 0.010,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  group.add(new THREE.Points(dustGeom, dustMat));

  // 9. BALANCED NATURAL COCKPIT LIGHTING RIG (Crisp grazing sunlight + realistic interior cabin shadow contrast!)
  const sunLight = new THREE.DirectionalLight(0xfff1dc, 3.2);
  const hemiLight = new THREE.HemisphereLight(0xb8d4f4, 0x262b24, 1.25);
  const nuclearLight = new THREE.DirectionalLight(0xffdcb0, 0.0);
  group.add(sunLight, sunLight.target, hemiLight, nuclearLight, nuclearLight.target);

  const invAircraftQuat = new THREE.Quaternion();
  const tmpSun = new THREE.Vector3();
  const tmpBurst = new THREE.Vector3();

  return {
    group,
    auditRefs: {
      lowerCabinWall,
      extLowerNoseSkin,
      extUpperRoofSkin,
    },
    update(flightState, worldSunDir, burstOrigin, activeStationId = "captain") {
      nordenPedestal.visible = activeStationId !== "bombardier";
      const thAngle = 0.42 - flightState.throttle * 0.82;
      for (const lv of throttleLevers) {
        lv.rotation.x = thAngle;
      }
      trimWheelGroup.rotation.x = flightState.yokePitchM * 6.0;

      invAircraftQuat.copy(flightState.quaternion).invert();
      tmpSun.copy(worldSunDir).applyQuaternion(invAircraftQuat);
      sunLight.position.copy(tmpSun).multiplyScalar(15.0);
      sunLight.target.position.set(0, 0, -3.2);

      if (flightState.shock.active) {
        const dt = flightState.shock.dt;
        const plumeLightY = burstOrigin[1] + Math.min(5500, dt * 85);
        tmpBurst.set(
          burstOrigin[0] - flightState.position[0],
          plumeLightY - flightState.position[1],
          burstOrigin[2] - flightState.position[2]
        ).normalize().applyQuaternion(invAircraftQuat);

        nuclearLight.position.copy(tmpBurst).multiplyScalar(18.0);
        nuclearLight.target.position.set(-0.2, 0.1, -3.2);

        const flash = flightState.shock.flashIntensity;
        nuclearLight.intensity = flash * 14.0 + Math.exp(-dt * 0.055) * 2.2;
        nuclearLight.color.setRGB(
          1.0,
          Math.min(1.0, 0.58 + flash * 0.35),
          Math.min(1.0, 0.28 + flash * 0.55)
        );
      } else {
        nuclearLight.intensity = 0.0;
      }

      const t = flightState.time;
      const shakeAmp = Math.hypot(...flightState.shock.cockpitShake) * 14.0;
      dustMat.opacity = Math.min(0.75, 0.22 + shakeAmp * 1.6 + nuclearLight.intensity * 0.03);
      const attr = dustGeom.attributes.position;
      for (let i = 0; i < dustCount; i++) {
        const bx = dustBase[i * 3];
        const by = dustBase[i * 3 + 1];
        const bz = dustBase[i * 3 + 2];
        const ph = i * 1.71;
        attr.setXYZ(
          i,
          bx + Math.sin(t * 0.45 + ph) * 0.03 + flightState.shock.cockpitShake[0] * 1.8,
          by + Math.cos(t * 0.38 + ph * 1.3) * 0.025 + shakeAmp * 0.12 * Math.sin(t * 14 + ph),
          bz + Math.sin(t * 0.31 + ph * 0.7) * 0.025
        );
      }
      attr.needsUpdate = true;
    },
  };
}
