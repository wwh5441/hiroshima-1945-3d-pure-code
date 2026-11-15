import * as THREE from "../../vendor/three.module.js";

// 1:1 Smithsonian NASM "Enola Gay" Boeing B-29-45-MO Control Column & Molded Bakelite Control Wheel
// - Authentic domed black enamel center cap featuring the Art-Deco silver winged B-29 silhouette ("BOEING / B-29")
// - Continuous variable-cross-section lofted gloss-black Bakelite butterfly horns with front finger scallops
// - Recessed brushed-steel Push-To-Talk (PTT) microphone thumb switch at top of horn
// - Oval cast-aluminum offset column, pleated leather floor boot & 15-turn coiled rubber radio cord

function createEnolaGayYokeCapTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d");

  // Glossy piano-black enamel base with subtle convex radial vignette
  const bg = ctx.createRadialGradient(230, 210, 18, 256, 256, 248);
  bg.addColorStop(0.0, "#23282e");
  bg.addColorStop(0.55, "#111418");
  bg.addColorStop(1.0, "#080a0c");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(256, 256, 248, 0, Math.PI * 2);
  ctx.fill();

  // Outer brushed-silver hairline ring
  ctx.strokeStyle = "#cfd7df";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(256, 256, 232, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(207, 215, 223, 0.42)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(256, 256, 216, 0, Math.PI * 2);
  ctx.stroke();

  // Stylized Silver Art-Deco Winged B-29 Silhouette (Smithsonian NASM Enola Gay restoration artifact!)
  ctx.fillStyle = "#dde5ed";
  ctx.strokeStyle = "#dde5ed";

  // Swept Deco main wing
  ctx.beginPath();
  ctx.moveTo(256, 242);
  ctx.lineTo(66, 256);
  ctx.lineTo(76, 267);
  ctx.lineTo(256, 263);
  ctx.lineTo(436, 267);
  ctx.lineTo(446, 256);
  ctx.closePath();
  ctx.fill();

  // Sleek circular B-29 fuselage nose + dorsal tail fin silhouette
  ctx.beginPath();
  ctx.ellipse(256, 256, 17, 54, 0, 0, Math.PI * 2);
  ctx.fill();

  // Horizontal stabilizer at tail (top of emblem)
  ctx.beginPath();
  ctx.moveTo(256, 198);
  ctx.lineTo(202, 206);
  ctx.lineTo(206, 214);
  ctx.lineTo(256, 211);
  ctx.lineTo(306, 214);
  ctx.lineTo(310, 206);
  ctx.closePath();
  ctx.fill();

  // 4 Wright R-3350 Engine Nacelles protruding forward from leading edge
  for (const nx of [146, 196, 316, 366]) {
    ctx.beginPath();
    ctx.ellipse(nx, 266, 7.5, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Deco speed-wing accent lines flanking "BOEING"
  ctx.lineWidth = 3;
  for (const dy of [-8, 0, 8]) {
    const inset = Math.abs(dy) * 1.8;
    ctx.beginPath();
    ctx.moveTo(96 + inset, 162 + dy);
    ctx.lineTo(154, 162 + dy);
    ctx.moveTo(358, 162 + dy);
    ctx.lineTo(416 - inset, 162 + dy);
    ctx.stroke();
  }

  // "BOEING" italic Art-Deco lettering above wing & "B - 2 9" below wing
  ctx.font = 'italic 800 42px "Trebuchet MS", "Arial Narrow", Arial, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BOEING", 256, 162);

  ctx.font = '700 30px "Trebuchet MS", Arial, sans-serif';
  ctx.fillStyle = "#c8d2dc";
  ctx.fillText("B - 2 9", 256, 332);

  // 3 small perimeter retaining screw heads
  for (const deg of [90, 210, 330]) {
    const a = (deg * Math.PI) / 180;
    const sx = 256 + Math.cos(a) * 204;
    const sy = 256 + Math.sin(a) * 204;
    ctx.fillStyle = "#8d97a2";
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#22262a";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(sx - 5, sy - 2);
    ctx.lineTo(sx + 5, sy + 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Loft a smooth variable-radius, variable-aspect-ratio spline mesh with optional front finger scallops!
function buildVariableSplineLoft(curve, tubularSegs, radialSegs, radiusFn) {
  const frames = curve.computeFrenetFrames(tubularSegs, false);
  const pos = [];
  const uvs = [];
  const idx = [];

  for (let i = 0; i <= tubularSegs; i++) {
    const u = i / tubularSegs;
    const pt = curve.getPointAt(u);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const { rx, rz, frontGroove } = radiusFn(u, pt);

    for (let j = 0; j <= radialSegs; j++) {
      const v = j / radialSegs;
      const ang = v * Math.PI * 2;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);

      const px = pt.x + (N.x * ca * rx + B.x * sa * rz);
      const py = pt.y + (N.y * ca * rx + B.y * sa * rz);
      let pz = pt.z + (N.z * ca * rx + B.z * sa * rz);

      // Molded ergonomic front (-Z) finger grooves along vertical grip region!
      if (frontGroove > 0 && pz < pt.z) {
        pz += frontGroove * (pt.z - pz) / Math.max(0.005, rz);
      }

      pos.push(px, py, pz);
      uvs.push(u * 4.0, v);
    }
  }

  const row = radialSegs + 1;
  for (let i = 0; i < tubularSegs; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      const c = (i + 1) * row + (j + 1);
      const d = i * row + (j + 1);
      // Frenet frame (T, N, B) is right-handed -> (a, b, c) or (a, c, b)?
      // Check: dP/du = T, dP/dv = -N sin + B cos; at v=0 (P = pt + N*rx), dP/dv = +B*rz; T x B = -N (inward!), so (a, c, b) is OUTWARD!
      idx.push(a, c, b, a, d, c);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

let _sharedEmblemMat = null;
let _sharedBakeliteMat = null;
let _sharedCastGreenMat = null;
let _sharedBrushedAlumMat = null;
let _sharedRubberCordMat = null;

function getYokeMaterials() {
  if (_sharedEmblemMat) {
    return {
      emblemMat: _sharedEmblemMat,
      bakeliteMat: _sharedBakeliteMat,
      castGreenMat: _sharedCastGreenMat,
      brushedAlumMat: _sharedBrushedAlumMat,
      rubberCordMat: _sharedRubberCordMat,
    };
  }
  _sharedEmblemMat = new THREE.MeshPhysicalMaterial({
    map: createEnolaGayYokeCapTexture(),
    roughness: 0.22,
    metalness: 0.18,
    clearcoat: 0.65,
    clearcoatRoughness: 0.16,
  });
  _sharedBakeliteMat = new THREE.MeshPhysicalMaterial({
    color: 0x111316,
    roughness: 0.24,
    metalness: 0.06,
    clearcoat: 0.72,
    clearcoatRoughness: 0.20,
  });
  _sharedCastGreenMat = new THREE.MeshStandardMaterial({
    color: 0x2b3428, // Authentic USAAF Dull Dark Green / Bronze Green cast aluminum
    roughness: 0.56,
    metalness: 0.52,
  });
  _sharedBrushedAlumMat = new THREE.MeshStandardMaterial({
    color: 0xc8d0d8,
    roughness: 0.28,
    metalness: 0.88,
  });
  _sharedRubberCordMat = new THREE.MeshStandardMaterial({
    color: 0x181a1c,
    roughness: 0.78,
    metalness: 0.04,
  });
  return {
    emblemMat: _sharedEmblemMat,
    bakeliteMat: _sharedBakeliteMat,
    castGreenMat: _sharedCastGreenMat,
    brushedAlumMat: _sharedBrushedAlumMat,
    rubberCordMat: _sharedRubberCordMat,
  };
}

export function buildAuthenticBoeingYoke(sideSign) {
  const { emblemMat, bakeliteMat, castGreenMat, brushedAlumMat, rubberCordMat } = getYokeMaterials();
  const pitchPivot = new THREE.Group();

  // 1. Pleated Leather Floor Dust Boot + 6-Bolt Cast Floor Flange at outboard root (sideSign * 0.27m, y = 0)
  const bootLathePts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const r = 0.062 * (1.0 - t * 0.45) + (i % 2 === 0 ? 0.006 : -0.004);
    bootLathePts.push(new THREE.Vector2(Math.max(0.026, r), t * 0.11));
  }
  const bootMesh = new THREE.Mesh(new THREE.LatheGeometry(bootLathePts, 20), rubberCordMat);
  bootMesh.position.set(sideSign * 0.27, -0.02, 0.0);
  pitchPivot.add(bootMesh);

  // 2. Variable-Taper Oval Cast-Aluminum Offset Control Column sweeping inward to chest height (y = 0.88m)
  const colCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(sideSign * 0.27, 0.04, 0.0),
    new THREE.Vector3(sideSign * 0.265, 0.36, 0.015),
    new THREE.Vector3(sideSign * 0.19, 0.64, 0.036),
    new THREE.Vector3(sideSign * 0.06, 0.82, 0.052),
    new THREE.Vector3(0.0, 0.88, 0.056),
  ]);
  const colGeom = buildVariableSplineLoft(colCurve, 32, 18, (u) => ({
    rx: 0.028 * (1.0 - u * 0.22),
    rz: 0.021 * (1.0 - u * 0.18),
    frontGroove: 0,
  }));
  pitchPivot.add(new THREE.Mesh(colGeom, castGreenMat));

  // Machined Cast-Aluminum Shaft Collar Housing behind the wheel
  const shaftHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.033, 0.055, 22),
    castGreenMat
  );
  shaftHousing.rotation.x = Math.PI * 0.5;
  shaftHousing.position.set(0.0, 0.88, 0.068);
  pitchPivot.add(shaftHousing);

  // 3. Authentic 15-Turn Coiled Black Rubber Microphone Cord spiraling up column into yoke!
  const cordPts = [];
  for (let i = 0; i <= 96; i++) {
    const t = i / 96;
    const base = colCurve.getPointAt(0.46 + t * 0.48);
    const coilAng = t * Math.PI * 2 * 14.0;
    const coilR = 0.029 * (1.0 - t * 0.15);
    cordPts.push(
      new THREE.Vector3(
        base.x + Math.cos(coilAng) * coilR,
        base.y - 0.015,
        base.z + Math.sin(coilAng) * coilR
      )
    );
  }
  const cordCurve = new THREE.CatmullRomCurve3(cordPts);
  const cordMesh = new THREE.Mesh(new THREE.TubeGeometry(cordCurve, 96, 0.0038, 6, false), rubberCordMat);
  pitchPivot.add(cordMesh);

  // 4. Rotating Boeing B-29 Molded Bakelite Butterfly Wheel Assembly (y = 0.88m -> cockpit y = +0.22m)
  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(0.0, 0.88, 0.095);

  // Sleek tapered cast-aluminum center boss (only 2.0cm deep, NOT a soup can!) + brushed bezel ring + domed emblem
  const bossLathePts = [
    new THREE.Vector2(0.001, -0.014),
    new THREE.Vector2(0.036, -0.014),
    new THREE.Vector2(0.044, -0.004),
    new THREE.Vector2(0.044, 0.006),
    new THREE.Vector2(0.039, 0.010),
  ];
  const bossGeom = new THREE.LatheGeometry(bossLathePts, 32);
  bossGeom.rotateX(Math.PI * 0.5);
  wheelGroup.add(new THREE.Mesh(bossGeom, castGreenMat));

  // Brushed aluminum retaining bezel ring around medallion
  const bezelRing = new THREE.Mesh(new THREE.TorusGeometry(0.0385, 0.0028, 12, 36), brushedAlumMat);
  bezelRing.position.z = 0.0105;
  wheelGroup.add(bezelRing);

  // Slightly convex domed glossy black enamel "BOEING / B-29" center cap!
  const capGeom = new THREE.SphereGeometry(0.095, 32, 16, 0, Math.PI * 2, 0, 0.405);
  // Adjust UVs from polar cap projection onto [0..1]x[0..1] so circular emblem texture maps distortion-free!
  const capPos = capGeom.attributes.position;
  const capUv = capGeom.attributes.uv;
  const maxR = Math.sin(0.405) * 0.095;
  for (let i = 0; i < capPos.count; i++) {
    const x = capPos.getX(i);
    const z = capPos.getZ(i);
    capUv.setXY(i, 0.5 + (x / maxR) * 0.48, 0.5 - (z / maxR) * 0.48);
  }
  const capMesh = new THREE.Mesh(capGeom, emblemMat);
  capMesh.rotation.x = Math.PI * 0.5;
  capMesh.position.z = 0.011 - Math.cos(0.405) * 0.095;
  wheelGroup.add(capMesh);

  // 5. Left & Right Continuous Lofted Gloss-Black Bakelite Rams-Horn / Butterfly Arms + PTT Thumb Switches!
  for (const hs of [-1, 1]) {
    const hornCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(hs * 0.034, -0.008, -0.002),  // Hub root
      new THREE.Vector3(hs * 0.082, -0.034, -0.001),  // Swept lower spoke dip
      new THREE.Vector3(hs * 0.132, -0.052, 0.000),   // Lower horn elbow
      new THREE.Vector3(hs * 0.150, -0.026, 0.002),   // Lower grip (pinky/ring)
      new THREE.Vector3(hs * 0.150, 0.012, 0.002),    // Center grip (middle/index) -> exact anchor x = +-0.150!
      new THREE.Vector3(hs * 0.148, 0.052, 0.004),    // Upper grip neck
      new THREE.Vector3(hs * 0.140, 0.078, 0.008),    // Flared thumb-switch boss
      new THREE.Vector3(hs * 0.122, 0.096, 0.006),    // Inward-curved upper horn tip
    ]);

    const hornGeom = buildVariableSplineLoft(hornCurve, 44, 20, (u, pt) => {
      // Sculpted flattened oval spoke (u < 0.28) -> ergonomic round grip with 4 finger scallops (0.32..0.72) -> flared thumb crown!
      if (u < 0.28) {
        const t = u / 0.28;
        return {
          rx: 0.0155 * (0.85 + 0.15 * t),
          rz: 0.0115 + 0.004 * t,
          frontGroove: 0,
        };
      }
      if (u < 0.74) {
        const gu = (u - 0.30) / 0.42;
        const scallop = gu >= 0 && gu <= 1 ? Math.max(0, Math.sin(gu * Math.PI * 4.0)) * 0.0024 : 0;
        return {
          rx: 0.0154,
          rz: 0.0156,
          frontGroove: scallop,
        };
      }
      const tu = (u - 0.74) / 0.26;
      const swell = Math.sin(tu * Math.PI) * 0.0035;
      const tipTaper = u > 0.92 ? 1.0 - ((u - 0.92) / 0.08) * 0.42 : 1.0;
      return {
        rx: (0.0155 + swell) * tipTaper,
        rz: (0.0155 + swell) * tipTaper,
        frontGroove: 0,
      };
    });
    wheelGroup.add(new THREE.Mesh(hornGeom, bakeliteMat));

    // Rounded hemispherical Bakelite cap on upper horn tip
    const tipCap = new THREE.Mesh(new THREE.SphereGeometry(0.0092, 14, 10), bakeliteMat);
    tipCap.position.set(hs * 0.122, 0.096, 0.006);
    wheelGroup.add(tipCap);

    // Sculpted Brushed-Steel Push-To-Talk (PTT) Thumb Switch Bezel + Button on upper-inner horn boss!
    const pttGroup = new THREE.Group();
    pttGroup.position.set(hs * 0.141, 0.075, 0.014);
    pttGroup.rotation.set(0.52, -hs * 0.25, hs * 0.18);

    const pttCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.011, 0.006, 16), brushedAlumMat);
    const pttButton = new THREE.Mesh(new THREE.SphereGeometry(0.0068, 14, 10), rubberCordMat);
    pttButton.position.y = 0.0032;
    pttGroup.add(pttCollar, pttButton);
    wheelGroup.add(pttGroup);
  }

  // Exact Grip Anchors on the Left (-0.150) & Right (+0.150) vertical Bakelite horns!
  const leftGripAnchor = new THREE.Object3D();
  leftGripAnchor.position.set(-0.150, 0.004, 0.002);
  const rightGripAnchor = new THREE.Object3D();
  rightGripAnchor.position.set(0.150, 0.004, 0.002);
  wheelGroup.add(leftGripAnchor, rightGripAnchor);

  pitchPivot.add(wheelGroup);
  return { pitchPivot, wheelGroup, leftGripAnchor, rightGripAnchor };
}
