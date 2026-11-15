import * as THREE from "../../vendor/three.module.js";

// True Continuous Catmull-Clark Subdivision Surface Anatomical Human Hand Sculptor
// - 100% single-piece manifold quad topology (ZERO intersecting capsules, cylinders, or boxes!)
// - 2 levels of exact Catmull-Clark subdivision -> 5,472 C2-smooth triangles per hand
// - Continuous palm -> 4 MCP knuckle peaks -> 3 interdigital skin webs -> 4 curled fingers + opposable thumb
// - Subdivided anatomical vertex attributes (knuckle capillary flush, tendon highlights, palmar creases, fingernails)
// - Buttoned USAAF olive-drab wool flight-shirt cuff + 1944 Type A-11 Ordnance wristwatch on Captain's left wrist

let _cachedRightGripGeom = null;
let _cachedLeftGripGeom = null;
let _cachedRelaxedRightGeom = null;
let _cachedRelaxedLeftGeom = null;
let _cachedSkinBundle = null;

function createSkinPbrMaps() {
  const size = 512;
  const albedoCanvas = document.createElement("canvas");
  albedoCanvas.width = albedoCanvas.height = size;
  const actx = albedoCanvas.getContext("2d");

  // Neutral white-balanced base so vertex colors drive macro anatomy while canvas adds real hemoglobin/melanin mottling!
  actx.fillStyle = "#f2ebe6";
  actx.fillRect(0, 0, size, size);

  // Subdermal hemoglobin (rose) & melanin (warm ochre/olive) micro-mottling — eliminates plastic uniform CG skin!
  for (let i = 0; i < 6500; i++) {
    const px = Math.abs((Math.sin(i * 19.137) * 43758.5453) % 1) * size;
    const py = Math.abs((Math.sin(i * 73.921) * 28411.913) % 1) * size;
    const rad = 1.5 + (i % 5) * 1.4;
    if (i % 3 === 0) {
      actx.fillStyle = "rgba(196, 112, 98, 0.085)"; // Capillary flush
    } else if (i % 3 === 1) {
      actx.fillStyle = "rgba(182, 146, 108, 0.075)"; // Melanin freckle/tan speckle
    } else {
      actx.fillStyle = "rgba(255, 244, 236, 0.065)"; // Specular pore highlight
    }
    actx.beginPath();
    actx.arc(px, py, rad, 0, Math.PI * 2);
    actx.fill();
  }

  // Subtle subcutaneous dorsal vein traces
  actx.strokeStyle = "rgba(104, 126, 138, 0.07)";
  actx.lineWidth = 3.2;
  for (let v = 0; v < 7; v++) {
    const sx = (v / 7) * size;
    actx.beginPath();
    actx.moveTo(sx, 0);
    actx.bezierCurveTo(sx + 28, size * 0.35, sx - 24, size * 0.7, sx + 14, size);
    actx.stroke();
  }

  // Fine transverse knuckle & phalanx skin crease lines in albedo
  actx.strokeStyle = "rgba(118, 74, 58, 0.12)";
  actx.lineWidth = 1.1;
  for (let row = 0; row < 56; row++) {
    const y = (row / 56) * size;
    actx.beginPath();
    for (let x = 0; x <= size; x += 16) {
      const wy = y + Math.sin(x * 0.07 + row * 1.5) * 2.0;
      if (x === 0) actx.moveTo(x, wy);
      else actx.lineTo(x, wy);
    }
    actx.stroke();
  }

  const albedoTex = new THREE.CanvasTexture(albedoCanvas);
  albedoTex.wrapS = albedoTex.wrapT = THREE.RepeatWrapping;
  albedoTex.repeat.set(2.5, 2.5);
  albedoTex.colorSpace = THREE.SRGBColorSpace;

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext("2d");

  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, size, size);

  // Fine directional skin grain, dorsal pores & transverse knuckle/joint flexion creases
  for (let i = 0; i < 18000; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 29432.173) % 1;
    const px = Math.abs(x) * size;
    const py = Math.abs(y) * size;
    const lum = i % 2 === 0 ? 152 : 104;
    bctx.fillStyle = `rgb(${lum},${lum},${lum})`;
    bctx.fillRect(px, py, 1.5, 1.2);
  }

  // Cross-hatched Langer's skin tension lines & deep joint wrinkle bands
  bctx.strokeStyle = "rgba(68, 68, 68, 0.42)";
  bctx.lineWidth = 1.3;
  for (let row = 0; row < 56; row++) {
    const y = (row / 56) * size;
    bctx.beginPath();
    for (let x = 0; x <= size; x += 14) {
      const wy = y + Math.sin(x * 0.065 + row * 1.3) * 2.4;
      if (x === 0) bctx.moveTo(x, wy);
      else bctx.lineTo(x, wy);
    }
    bctx.stroke();
  }

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(3, 3);

  // Watch dial texture (1944 USAAF Elgin Type A-11 Ordnance Watch)
  const wCanvas = document.createElement("canvas");
  wCanvas.width = wCanvas.height = 128;
  const wctx = wCanvas.getContext("2d");
  wctx.fillStyle = "#111315";
  wctx.beginPath();
  wctx.arc(64, 64, 60, 0, Math.PI * 2);
  wctx.fill();
  wctx.strokeStyle = "#d8e4b8";
  wctx.fillStyle = "#d8e4b8";
  wctx.font = "bold 13px Arial, sans-serif";
  wctx.textAlign = "center";
  wctx.textBaseline = "middle";
  for (let h = 1; h <= 12; h++) {
    const a = (h / 12) * Math.PI * 2 - Math.PI * 0.5;
    wctx.lineWidth = h % 3 === 0 ? 2.4 : 1.3;
    wctx.beginPath();
    wctx.moveTo(64 + Math.cos(a) * 48, 64 + Math.sin(a) * 48);
    wctx.lineTo(64 + Math.cos(a) * 55, 64 + Math.sin(a) * 55);
    wctx.stroke();
    wctx.fillText(String(h), 64 + Math.cos(a) * 38, 64 + Math.sin(a) * 38);
  }
  // Watch hands at 08:15 JST
  wctx.strokeStyle = "#eef6d8";
  wctx.lineWidth = 3.0;
  wctx.beginPath();
  wctx.moveTo(64, 64);
  wctx.lineTo(64 - 22, 64 + 12);
  wctx.stroke();
  wctx.lineWidth = 2.0;
  wctx.beginPath();
  wctx.moveTo(64, 64);
  wctx.lineTo(64 + 34, 64);
  wctx.stroke();

  const watchDialTex = new THREE.CanvasTexture(wCanvas);
  watchDialTex.colorSpace = THREE.SRGBColorSpace;

  return { albedoTex, bumpTex, watchDialTex };
}

export function getHandMaterials() {
  if (_cachedSkinBundle) return _cachedSkinBundle;
  const { albedoTex, bumpTex, watchDialTex } = createSkinPbrMaps();

  const skinMat = new THREE.MeshPhysicalMaterial({
    map: albedoTex,
    vertexColors: true,
    bumpMap: bumpTex,
    bumpScale: 0.0022,
    roughness: 0.56,
    metalness: 0.01,
    envMapIntensity: 0.35,
    clearcoat: 0.10,
    clearcoatRoughness: 0.46,
    sheen: 0.32,
    sheenRoughness: 0.62,
    sheenColor: new THREE.Color(0xe08b72),
  });

  const shirtWoolMat = new THREE.MeshStandardMaterial({
    color: 0x5c583f, // Authentic USAAF Olive-Drab / Dark Khaki Wool O.D. Flying Shirt
    bumpMap: bumpTex,
    bumpScale: 0.0022,
    roughness: 0.88,
    metalness: 0.02,
  });

  const watchSteelMat = new THREE.MeshStandardMaterial({
    color: 0xc4ccd2,
    roughness: 0.28,
    metalness: 0.86,
  });

  const watchStrapMat = new THREE.MeshStandardMaterial({
    color: 0x4b4e38,
    roughness: 0.86,
    metalness: 0.04,
  });

  const watchFaceMat = new THREE.MeshStandardMaterial({
    map: watchDialTex,
    roughness: 0.18,
    metalness: 0.15,
  });

  _cachedSkinBundle = { skinMat, shirtWoolMat, watchSteelMat, watchStrapMat, watchFaceMat };
  return _cachedSkinBundle;
}

// Exact Catmull-Clark Subdivision for Manifold Quad Meshes with Open Boundary Preservation + Vertex Color Interpolation
function catmullClarkSubdivide(verts, colors, quads, iterations = 2) {
  let curV = verts.map((v) => v.slice());
  let curC = colors.map((c) => c.slice());
  let curQ = quads.map((q) => q.slice());

  for (let it = 0; it < iterations; it++) {
    const nV = curV.length;
    const nQ = curQ.length;

    // 1. Face points & colors (average of 4 quad corners)
    const faceV = new Array(nQ);
    const faceC = new Array(nQ);
    for (let f = 0; f < nQ; f++) {
      const [a, b, c, d] = curQ[f];
      faceV[f] = [
        0.25 * (curV[a][0] + curV[b][0] + curV[c][0] + curV[d][0]),
        0.25 * (curV[a][1] + curV[b][1] + curV[c][1] + curV[d][1]),
        0.25 * (curV[a][2] + curV[b][2] + curV[c][2] + curV[d][2]),
      ];
      faceC[f] = [
        0.25 * (curC[a][0] + curC[b][0] + curC[c][0] + curC[d][0]),
        0.25 * (curC[a][1] + curC[b][1] + curC[c][1] + curC[d][1]),
        0.25 * (curC[a][2] + curC[b][2] + curC[c][2] + curC[d][2]),
      ];
    }

    // 2. Build edge table & vertex adjacency
    const edgeMap = new Map();
    const vertFaces = Array.from({ length: nV }, () => []);
    const vertEdges = Array.from({ length: nV }, () => []);

    const getEdgeIdx = (u, v, fIdx) => {
      const k = u < v ? `${u}_${v}` : `${v}_${u}`;
      let e = edgeMap.get(k);
      if (!e) {
        e = { u: Math.min(u, v), v: Math.max(u, v), faces: [], idx: edgeMap.size };
        edgeMap.set(k, e);
        vertEdges[u].push(e);
        vertEdges[v].push(e);
      }
      e.faces.push(fIdx);
      return e.idx;
    };

    const quadEdges = new Array(nQ);
    for (let f = 0; f < nQ; f++) {
      const q = curQ[f];
      for (let i = 0; i < 4; i++) vertFaces[q[i]].push(f);
      quadEdges[f] = [
        getEdgeIdx(q[0], q[1], f),
        getEdgeIdx(q[1], q[2], f),
        getEdgeIdx(q[2], q[3], f),
        getEdgeIdx(q[3], q[0], f),
      ];
    }

    // 3. Edge points
    const nE = edgeMap.size;
    const edgeV = new Array(nE);
    const edgeC = new Array(nE);
    for (const e of edgeMap.values()) {
      const va = curV[e.u];
      const vb = curV[e.v];
      const ca = curC[e.u];
      const cb = curC[e.v];
      if (e.faces.length === 2) {
        const f0 = faceV[e.faces[0]];
        const f1 = faceV[e.faces[1]];
        const fc0 = faceC[e.faces[0]];
        const fc1 = faceC[e.faces[1]];
        edgeV[e.idx] = [
          0.25 * (va[0] + vb[0] + f0[0] + f1[0]),
          0.25 * (va[1] + vb[1] + f0[1] + f1[1]),
          0.25 * (va[2] + vb[2] + f0[2] + f1[2]),
        ];
        edgeC[e.idx] = [
          0.25 * (ca[0] + cb[0] + fc0[0] + fc1[0]),
          0.25 * (ca[1] + cb[1] + fc0[1] + fc1[1]),
          0.25 * (ca[2] + cb[2] + fc0[2] + fc1[2]),
        ];
      } else {
        // Boundary edge midpoint
        edgeV[e.idx] = [0.5 * (va[0] + vb[0]), 0.5 * (va[1] + vb[1]), 0.5 * (va[2] + vb[2])];
        edgeC[e.idx] = [0.5 * (ca[0] + cb[0]), 0.5 * (ca[1] + cb[1]), 0.5 * (ca[2] + cb[2])];
      }
    }

    // 4. Updated original vertices
    const nextV = new Array(nV + nQ + nE);
    const nextC = new Array(nV + nQ + nE);
    for (let v = 0; v < nV; v++) {
      const p = curV[v];
      const c = curC[v];
      const bEdges = vertEdges[v].filter((e) => e.faces.length === 1);
      if (bEdges.length >= 2) {
        // Smooth open cuff boundary curve: 3/4 * P + 1/8 * (N0 + N1)
        const n0 = bEdges[0].u === v ? bEdges[0].v : bEdges[0].u;
        const n1 = bEdges[1].u === v ? bEdges[1].v : bEdges[1].u;
        nextV[v] = [
          0.75 * p[0] + 0.125 * (curV[n0][0] + curV[n1][0]),
          0.75 * p[1] + 0.125 * (curV[n0][1] + curV[n1][1]),
          0.75 * p[2] + 0.125 * (curV[n0][2] + curV[n1][2]),
        ];
        nextC[v] = c.slice();
      } else {
        const faces = vertFaces[v];
        const edges = vertEdges[v];
        const n = faces.length;
        let fx = 0, fy = 0, fz = 0;
        for (const fi of faces) {
          fx += faceV[fi][0];
          fy += faceV[fi][1];
          fz += faceV[fi][2];
        }
        fx /= n; fy /= n; fz /= n;

        let rx = 0, ry = 0, rz = 0;
        for (const e of edges) {
          rx += 0.5 * (curV[e.u][0] + curV[e.v][0]);
          ry += 0.5 * (curV[e.u][1] + curV[e.v][1]);
          rz += 0.5 * (curV[e.u][2] + curV[e.v][2]);
        }
        rx /= edges.length; ry /= edges.length; rz /= edges.length;

        const wF = 1 / n;
        const wR = 2 / n;
        const wP = (n - 3) / n;
        nextV[v] = [
          wF * fx + wR * rx + wP * p[0],
          wF * fy + wR * ry + wP * p[1],
          wF * fz + wR * rz + wP * p[2],
        ];
        nextC[v] = c.slice();
      }
    }

    for (let f = 0; f < nQ; f++) {
      nextV[nV + f] = faceV[f];
      nextC[nV + f] = faceC[f];
    }
    for (let eIdx = 0; eIdx < nE; eIdx++) {
      nextV[nV + nQ + eIdx] = edgeV[eIdx];
      nextC[nV + nQ + eIdx] = edgeC[eIdx];
    }

    // 5. Split each quad into 4 child quads preserving exact outward CCW winding!
    const nextQ = new Array(nQ * 4);
    for (let f = 0; f < nQ; f++) {
      const [v0, v1, v2, v3] = curQ[f];
      const [e0, e1, e2, e3] = quadEdges[f];
      const fp = nV + f;
      const ep0 = nV + nQ + e0;
      const ep1 = nV + nQ + e1;
      const ep2 = nV + nQ + e2;
      const ep3 = nV + nQ + e3;
      nextQ[f * 4 + 0] = [v0, ep0, fp, ep3];
      nextQ[f * 4 + 1] = [ep0, v1, ep1, fp];
      nextQ[f * 4 + 2] = [fp, ep1, v2, ep2];
      nextQ[f * 4 + 3] = [ep3, fp, ep2, v3];
    }

    curV = nextV;
    curC = nextC;
    curQ = nextQ;
  }

  return { verts: curV, colors: curC, quads: curQ };
}

// Build Right (+1) or Left (-1) Anatomical Human Hand Cage wrapped around vertical Bakelite horn (x=0, z=0, R=0.0155m)
function buildHandGeometryInternal(sideSign, curlFactor = 1.0) {
  const verts = [];
  const colors = [];
  const quads = [];

  // Natural Caucasian pilot skin palette + baked anatomical contact Ambient Occlusion (AO)
  const colDorsal = [0.75, 0.52, 0.41];      // Sun-warmed weathered dorsal skin
  const colTendon = [0.82, 0.60, 0.49];      // Lighter stretched skin over extensor tendons
  const colKnuckle = [0.69, 0.40, 0.32];     // Capillary flush & skin folds over MCP/PIP/DIP knuckles
  const colPalmar = [0.77, 0.54, 0.45];      // Palmar grip skin
  const colWebShadow = [0.46, 0.26, 0.20];   // Deep warm AO in interdigital webs & joint flexion creases
  const colCreviceAO = [0.35, 0.19, 0.15];   // Contact shadow between adjacent curled fingers & against black Bakelite!
  const colNail = [0.89, 0.75, 0.69];        // Pale-rose keratin fingernail plate

  const addV = (rx, y, z, rgb) => {
    verts.push([rx * sideSign, y, z]);
    colors.push(rgb);
    return verts.length - 1;
  };

  // Finger Y stations along vertical Bakelite horn (Index top -> Pinky bottom)
  // 8 rows for the 4 fingers' top/bottom edges:
  const fY = [0.038, 0.021, 0.017, -0.001, -0.005, -0.022, -0.025, -0.041];

  // Ring 0: Distal Forearm inside Shirt Cuff (z = +0.112m, oval wrist shaft)
  // Ring 1: Anatomical Wrist Joint + Ulnar Styloid Bone (z = +0.072m)
  // Ring 2: Mid-Palm Metacarpal Arch & Thenar Base cradling outer-aft Bakelite horn (z = +0.032m)
  // Ring 3: MCP Knuckle Peaks & Palmar Grip Pads at outer-front corner of horn (z = -0.007m)
  const rings = [];

  const stationSpecs = [
    { zD: 0.114, zP: 0.114, xD: 0.031, xP: -0.008, yScale: 0.56, yOff: -0.005, zCurve: 0.014 },
    { zD: 0.072, zP: 0.070, xD: 0.034, xP: -0.004, yScale: 0.66, yOff: -0.003, zCurve: 0.015 },
    { zD: 0.030, zP: 0.020, xD: 0.039, xP: 0.014,  yScale: 0.90, yOff: 0.000,  zCurve: 0.010 },
    { zD: -0.008, zP: -0.006, xD: 0.032, xP: 0.0145, yScale: 1.00, yOff: 0.000, zCurve: 0.004 },
  ];

  for (let r = 0; r < 4; r++) {
    const st = stationSpecs[r];
    const ring = [];
    // 0..7: Dorsal (+X) from top (Index top) down to bottom (Pinky bottom)
    for (let i = 0; i < 8; i++) {
      const u = i / 7; // 0 top .. 1 bottom
      const arch = Math.sin(u * Math.PI); // Transverse dorsal metacarpal arch!
      const isKnucklePeak = r === 3 && (i === 0 || i === 1 || i === 2 || i === 3 || i === 4 || i === 5);
      // Prominent Middle & Index MCP knuckle peaks at r === 3
      const knuckleBump = r === 3 ? (i === 2 || i === 3 ? 0.0055 : i <= 5 ? 0.0038 : 0.0018) : 0.0;
      // Ulnar styloid bump on wrist (r === 1, pinky dorsal side i === 6, 7)
      const ulnarBump = r === 1 && i >= 6 ? 0.0035 : 0.0;
      const rx = st.xD + arch * 0.0065 + knuckleBump + ulnarBump;
      const y = fY[i] * st.yScale + st.yOff;
      const z = st.zD - (1.0 - arch) * st.zCurve + (r === 3 ? -knuckleBump * 0.7 : 0.0);
      const col = r === 3 ? (isKnucklePeak ? colKnuckle : colDorsal) : r === 2 && (i === 2 || i === 4) ? colTendon : colDorsal;
      ring.push(addV(rx, y, z, col));
    }
    // 8..15: Palmar (inner grip surface) from bottom (Pinky bottom i=7) up to top (Index top i=0)
    for (let j = 0; j < 8; j++) {
      const fIdx = 7 - j;
      const u = fIdx / 7;
      const arch = Math.sin(u * Math.PI);
      // At r=2,3 the palm presses snugly against the outer-aft arc of the R=0.0155m Bakelite horn!
      const hypothenarPad = r === 2 && fIdx >= 5 ? -0.003 : 0.0;
      const rx = st.xP - arch * 0.002 + hypothenarPad;
      const y = fY[fIdx] * st.yScale + st.yOff;
      const z = st.zP + (1.0 - arch) * st.zCurve * 0.7;
      ring.push(addV(rx, y, z, r >= 2 ? colPalmar : colDorsal));
    }
    rings.push(ring);
  }

  let thumbBaseLoop = null;
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 16; i++) {
      const j = (i + 1) % 16;
      if (r === 2 && i === 15) {
        // Seamless anatomical opening on radial-top saddle of palm for Thenar & Thumb!
        thumbBaseLoop = [rings[2][15], rings[2][0], rings[3][0], rings[3][15]];
        continue;
      }
      quads.push([rings[r][i], rings[r][j], rings[r + 1][j], rings[r + 1][i]]);
    }
  }

  const m = rings[3];
  const fingerBaseLoops = [
    [m[15], m[0], m[1], m[14]], // Index
    [m[13], m[2], m[3], m[12]], // Middle
    [m[11], m[4], m[5], m[10]], // Ring
    [m[9],  m[6], m[7], m[8]],  // Little
  ];

  // 3 Interdigital Skin Webbing Quads between adjacent fingers
  quads.push([m[1], m[2], m[13], m[14]]);
  quads.push([m[3], m[4], m[11], m[12]]);
  quads.push([m[5], m[6], m[9],  m[10]]);

  // Extrude 4 Anatomical Curled Fingers wrapping around the R = 0.0155m Bakelite Horn!
  const hornR = 0.0154;
  const fingerConfigs = [
    { yMid: 0.0295, rBase: 0.0086, maxTheta: 1.36 * Math.PI, yConverge: -0.003 }, // Index
    { yMid: 0.0080, rBase: 0.0092, maxTheta: 1.44 * Math.PI, yConverge: -0.001 }, // Middle (longest)
    { yMid: -0.0135, rBase: 0.0085, maxTheta: 1.39 * Math.PI, yConverge: 0.002 }, // Ring
    { yMid: -0.0330, rBase: 0.0072, maxTheta: 1.28 * Math.PI, yConverge: 0.004 }, // Little
  ];

  const segFracs = [0.22, 0.45, 0.67, 0.84, 0.95, 1.00]; // Proximal -> PIP -> Middle -> DIP -> Nailpad -> Apex

  for (let fk = 0; fk < 4; fk++) {
    const cfg = fingerConfigs[fk];
    let cur = fingerBaseLoops[fk];

    for (let s = 0; s < segFracs.length; s++) {
      const frac = segFracs[s];
      const theta = 0.14 * Math.PI + frac * (cfg.maxTheta - 0.14 * Math.PI) * curlFactor;
      // Taper phalanx radius smoothly; add slight anatomical swelling at PIP (s===1) & DIP (s===3) joints!
      const jointSwell = s === 1 ? 1.05 : s === 3 ? 1.02 : 1.0;
      const tipTaper = s === 5 ? 0.46 : s === 4 ? 0.78 : 1.0 - frac * 0.22;
      const rThick = cfg.rBase * tipTaper * jointSwell;
      const rWide = cfg.rBase * (s === 5 ? 0.52 : 1.0 - frac * 0.15) * jointSwell;

      // Centerline of phalanx sits at (hornR + rThick * 0.92) so inner palmar skin kisses Bakelite grip with 0mm gap!
      const pathR = curlFactor > 0.75
        ? hornR + rThick * 0.92
        : hornR + 0.012 + frac * 0.036;
      const cx = Math.cos(theta) * pathR;
      const cz = -Math.sin(theta) * pathR;
      const cy = cfg.yMid + cfg.yConverge * frac;

      // Radial outward normal from horn center = (cos(theta), 0, -sin(theta))
      const nx = Math.cos(theta);
      const nz = -Math.sin(theta);

      // Loop order matching [m_palmar_top, m_dorsal_top, m_dorsal_bot, m_palmar_bot]:
      // 0: Palmar-Top, 1: Dorsal-Top, 2: Dorsal-Bot, 3: Palmar-Bot
      const isNail = s === 4;
      const isJoint = s === 1 || s === 3;
      const dorsalBase = isNail ? colNail : isJoint ? colKnuckle : s === 0 || s === 2 ? colTendon : colDorsal;
      // Bake contact AO along adjacent finger touch seams so every curled finger reads as a distinct anatomical digit!
      const topPalmarCol = fk > 0 ? colCreviceAO : isJoint ? colWebShadow : colPalmar;
      const botPalmarCol = fk < 3 ? colCreviceAO : isJoint ? colWebShadow : colPalmar;
      const topDorsalCol = fk > 0 && s <= 3 && !isNail ? [dorsalBase[0] * 0.80, dorsalBase[1] * 0.76, dorsalBase[2] * 0.75] : dorsalBase;
      const botDorsalCol = fk < 3 && s <= 3 && !isNail ? [dorsalBase[0] * 0.78, dorsalBase[1] * 0.74, dorsalBase[2] * 0.73] : dorsalBase;

      // Flatten dorsal fingernail bed slightly at s === 4 for authentic human fingertip profile!
      const dorsalFlat = isNail ? 0.76 : 1.0;

      const v0 = addV(cx - nx * rThick, cy + rWide * 0.90, cz - nz * rThick, topPalmarCol);
      const v1 = addV(cx + nx * rThick * dorsalFlat, cy + rWide * 0.86, cz + nz * rThick * dorsalFlat, topDorsalCol);
      const v2 = addV(cx + nx * rThick * dorsalFlat, cy - rWide * 0.86, cz + nz * rThick * dorsalFlat, botDorsalCol);
      const v3 = addV(cx - nx * rThick, cy - rWide * 0.90, cz - nz * rThick, botPalmarCol);

      const nxt = [v0, v1, v2, v3];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        quads.push([cur[i], cur[j], nxt[j], nxt[i]]);
      }
      cur = nxt;
    }
    // Cap rounded fingertip cleanly with 1 quad!
    quads.push([cur[0], cur[1], cur[2], cur[3]]);
  }

  // Extrude Continuous Opposable Thumb from radial-top saddle (thumbBaseLoop = [c15, c0, m0, m15]):
  // Wraps cleanly around the aft/side shoulder of the Bakelite horn with zero clipping, pad poised at PTT button!
  const thumbStations = [
    // 0: Thenar muscular eminence & first dorsal interosseous web
    { cx: 0.020, cy: 0.043, cz: 0.026, rx: 0.0125, ry: 0.010, rz: 0.0135, nail: false, joint: false },
    // 1: Thumb MCP joint rising outside-aft of horn shoulder
    { cx: 0.013, cy: 0.056, cz: 0.022, rx: 0.0102, ry: 0.0088, rz: 0.0102, nail: false, joint: true },
    // 2: Thumb IP joint curving onto upper-aft PTT switch boss
    { cx: 0.006, cy: 0.068, cz: 0.018, rx: 0.0092, ry: 0.0078, rz: 0.0092, nail: false, joint: true },
    // 3: Flattened Distal Thumb Pad + Thumbnail poised against PTT switch!
    { cx: 0.002, cy: 0.077, cz: 0.015, rx: 0.0084, ry: 0.0065, rz: 0.0082, nail: true, joint: false },
    // 4: Rounded Thumb Tip Apex
    { cx: 0.000, cy: 0.083, cz: 0.013, rx: 0.0052, ry: 0.0042, rz: 0.0052, nail: false, joint: false },
  ];

  let curT = thumbBaseLoop; // [c15 (palmar-aft), c0 (dorsal-aft), m0 (dorsal-fwd), m15 (palmar-fwd)]
  for (let ts = 0; ts < thumbStations.length; ts++) {
    const st = thumbStations[ts];
    const dCol = st.nail ? colNail : st.joint ? colKnuckle : colDorsal;
    const pCol = st.joint ? colWebShadow : colPalmar;
    // Match exact corner orientation of [c15 (inner-aft), c0 (outer-aft), m0 (outer-fwd), m15 (inner-fwd)]!
    const t0 = addV(st.cx - st.rx, st.cy, st.cz + st.rz, pCol);
    const t1 = addV(st.cx + st.rx, st.cy + st.ry * 0.25, st.cz + st.rz, dCol);
    const t2 = addV(st.cx + st.rx, st.cy + st.ry * 0.25, st.cz - st.rz, dCol);
    const t3 = addV(st.cx - st.rx, st.cy - st.ry * 0.25, st.cz - st.rz, pCol);
    const nxtT = [t0, t1, t2, t3];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      quads.push([curT[i], curT[j], nxtT[j], nxtT[i]]);
    }
    curT = nxtT;
  }
  quads.push([curT[0], curT[1], curT[2], curT[3]]);

  // Run 2 iterations of exact Catmull-Clark Subdivision -> silky-smooth single-piece anatomical skin!
  const sub = catmullClarkSubdivide(verts, colors, quads, 2);

  const posArr = new Float32Array(sub.verts.length * 3);
  const colArr = new Float32Array(sub.verts.length * 3);
  const uvArr = new Float32Array(sub.verts.length * 2);
  const tmpColor = new THREE.Color();

  for (let i = 0; i < sub.verts.length; i++) {
    const [x, y, z] = sub.verts[i];
    posArr[i * 3] = x;
    posArr[i * 3 + 1] = y;
    posArr[i * 3 + 2] = z;

    tmpColor.setRGB(sub.colors[i][0], sub.colors[i][1], sub.colors[i][2], THREE.SRGBColorSpace);
    colArr[i * 3] = tmpColor.r;
    colArr[i * 3 + 1] = tmpColor.g;
    colArr[i * 3 + 2] = tmpColor.b;

    // Smooth tri-planar-like anatomical UV mapping for skin micro-bump pores & creases
    uvArr[i * 2] = (z + 0.08) * 5.5 + x * 2.0;
    uvArr[i * 2 + 1] = (y + 0.06) * 5.5;
  }

  const indices = new Uint16Array(sub.quads.length * 6);
  let ptr = 0;
  for (let f = 0; f < sub.quads.length; f++) {
    const [a, b, c, d] = sub.quads[f];
    if (sideSign > 0) {
      indices[ptr++] = a; indices[ptr++] = b; indices[ptr++] = c;
      indices[ptr++] = a; indices[ptr++] = c; indices[ptr++] = d;
    } else {
      // Mirroring X flips handedness -> reverse triangle winding so normals point strictly OUTWARD!
      indices[ptr++] = a; indices[ptr++] = c; indices[ptr++] = b;
      indices[ptr++] = a; indices[ptr++] = d; indices[ptr++] = c;
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
  geom.setAttribute("color", new THREE.BufferAttribute(colArr, 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(uvArr, 2));
  geom.setIndex(new THREE.BufferAttribute(indices, 1));
  geom.computeVertexNormals();
  return geom;
}

// Build Lofted Buttoned USAAF Olive-Wool Flight-Shirt Cuff + Optional 1944 A-11 Pilot Wristwatch!
function buildWristCuffAndWatch(sideSign, mats, includeWatch = false) {
  const group = new THREE.Group();

  // Oval shirt cuff wrapping smoothly around the forearm-wrist opening (z = +0.086 .. +0.138)
  const rings = 8;
  const segs = 24;
  const pos = [];
  const uvs = [];
  const idx = [];
  for (let r = 0; r <= rings; r++) {
    const v = r / rings;
    const z = 0.075 + v * 0.062;
    const flare = 1.0 + v * 0.16 + Math.sin(v * Math.PI * 2.0) * 0.03;
    for (let s = 0; s <= segs; s++) {
      const u = s / segs;
      const ang = u * Math.PI * 2;
      // Anatomical oval centered at (sideSign * 0.012, -0.004) matching Ring 0..1 of hand!
      const pleat = 1.0 + 0.025 * Math.cos(ang * 5.0 + v * 2.0);
      const x = sideSign * 0.012 + Math.cos(ang) * 0.028 * flare * pleat;
      const y = -0.004 + Math.sin(ang) * 0.033 * flare * pleat;
      pos.push(x, y, z);
      uvs.push(u * 2, v);
    }
  }
  const row = segs + 1;
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segs; s++) {
      const a = r * row + s;
      const b = (r + 1) * row + s;
      const c = (r + 1) * row + (s + 1);
      const d = r * row + (s + 1);
      // z increases (+Z), ang goes CCW from +X -> +Y -> (a, c, b) is outward!
      idx.push(a, c, b, a, d, c);
    }
  }
  const cuffGeom = new THREE.BufferGeometry();
  cuffGeom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  cuffGeom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  cuffGeom.setIndex(idx);
  cuffGeom.computeVertexNormals();
  group.add(new THREE.Mesh(cuffGeom, mats.shirtWoolMat));

  // Olive melamine cuff button on outer ulnar placket
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.0025, 14), mats.watchStrapMat);
  btn.position.set(sideSign * 0.041, -0.012, 0.094);
  btn.rotation.z = Math.PI * 0.5;
  group.add(btn);

  if (includeWatch) {
    // 1944 USAAF Elgin Type A-11 Ordnance Wristwatch at z = +0.055m (clearly visible in pilot's downward peripheral FOV!)
    const watchGroup = new THREE.Group();
    watchGroup.position.set(sideSign * 0.014, -0.002, 0.055);

    // Oval olive canvas strap hugging wrist
    const strapPts = [];
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      strapPts.push(new THREE.Vector3(Math.cos(a) * 0.0255, Math.sin(a) * 0.0305, 0));
    }
    const strapCurve = new THREE.CatmullRomCurve3(strapPts, true);
    const strapMesh = new THREE.Mesh(new THREE.TubeGeometry(strapCurve, 32, 0.0055, 8, true), mats.watchStrapMat);
    strapMesh.scale.set(1, 1, 1.8);
    watchGroup.add(strapMesh);

    // Stainless steel case + coined bezel + radium dial angled on upper-radial wrist so pilot can read time on the yoke!
    const caseCluster = new THREE.Group();
    caseCluster.position.set(sideSign * 0.006, 0.027, 0);
    caseCluster.rotation.z = -sideSign * 0.24;

    const watchCase = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.016, 0.0065, 24), mats.watchSteelMat);
    const watchFace = new THREE.Mesh(new THREE.CircleGeometry(0.0132, 24), mats.watchFaceMat);
    watchFace.rotation.x = -Math.PI * 0.5;
    watchFace.position.y = 0.0035;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0024, 0.004, 10), mats.watchSteelMat);
    crown.position.set(0, 0.001, -0.017);
    crown.rotation.x = Math.PI * 0.5;

    caseCluster.add(watchCase, watchFace, crown);
    watchGroup.add(caseCluster);
    group.add(watchGroup);
  }

  return group;
}

// Create Complete Gripping Hand Assembly (Parented directly to Yoke Horn Anchor so grip is 100% locked!)
export function createGrippingHandAssembly(sideSign, includeWatch = false) {
  const mats = getHandMaterials();
  if (sideSign > 0) {
    if (!_cachedRightGripGeom) _cachedRightGripGeom = buildHandGeometryInternal(+1, 1.0);
  } else {
    if (!_cachedLeftGripGeom) _cachedLeftGripGeom = buildHandGeometryInternal(-1, 1.0);
  }

  const root = new THREE.Group();
  const handMesh = new THREE.Mesh(sideSign > 0 ? _cachedRightGripGeom : _cachedLeftGripGeom, mats.skinMat);
  const cuffGroup = buildWristCuffAndWatch(sideSign, mats, includeWatch);
  root.add(handMesh, cuffGroup);

  // Exact Wrist Socket inside the shirt cuff (z = +0.128) where the Two-Bone IK Forearm connects seamlessly!
  const wristSocket = new THREE.Object3D();
  wristSocket.position.set(sideSign * 0.013, -0.005, 0.126);
  root.add(wristSocket);

  return { root, wristSocket };
}

// Create Relaxed / Lever-Gripping Anatomical 5-Finger Hand (for Throttle Pedestal, Bombardier & Flight Engineer!)
export function createRelaxedHandAssembly(sideSign) {
  const mats = getHandMaterials();
  if (sideSign > 0) {
    if (!_cachedRelaxedRightGeom) _cachedRelaxedRightGeom = buildHandGeometryInternal(+1, 0.68);
  } else {
    if (!_cachedRelaxedLeftGeom) _cachedRelaxedLeftGeom = buildHandGeometryInternal(-1, 0.68);
  }

  const root = new THREE.Group();
  const handMesh = new THREE.Mesh(sideSign > 0 ? _cachedRelaxedRightGeom : _cachedRelaxedLeftGeom, mats.skinMat);
  const cuffGroup = buildWristCuffAndWatch(sideSign, mats, false);
  root.add(handMesh, cuffGroup);
  return root;
}
