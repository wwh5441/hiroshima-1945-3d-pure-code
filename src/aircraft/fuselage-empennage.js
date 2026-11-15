import * as THREE from "../../vendor/three.module.js";

// Complete 30.18m Boeing B-29-45-MO ("Enola Gay" Silverplate #82) Fuselage,
// Forward Openable Bomb Bay & Clamshell Doors, Pressurized Communication Tunnel,
// Towering Boeing Dorsal-Finned Tail ("Circle-R" 6th BG Deceptive Marking) & Tail Gunner Station.

export function createStarAndBarsTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 512, 256);

  // Insignia Blue border
  ctx.fillStyle = "#192947";
  ctx.fillRect(36, 86, 440, 84);
  ctx.beginPath();
  ctx.arc(256, 128, 98, 0, Math.PI * 2);
  ctx.fill();

  // White bars
  ctx.fillStyle = "#eef2f6";
  ctx.fillRect(48, 100, 416, 56);

  // Blue inner circle
  ctx.beginPath();
  ctx.arc(256, 128, 84, 0, Math.PI * 2);
  ctx.fillStyle = "#192947";
  ctx.fill();

  // White 5-point star
  ctx.fillStyle = "#eef2f6";
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const r = k % 2 === 0 ? 76 : 30;
    const a = (k * Math.PI) / 5 - Math.PI / 2;
    const px = 256 + Math.cos(a) * r;
    const py = 128 + Math.sin(a) * r;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTailFinTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d");

  // Polished Alclad aluminum skin with panel seams & rivets
  ctx.fillStyle = "#cfd7e0";
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = "rgba(62, 70, 78, 0.36)";
  ctx.lineWidth = 1.5;
  for (let y = 48; y < 512; y += 56) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }
  for (let x = 64; x < 512; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  // Authentic August 6, 1945 Enola Gay Tail Marking:
  // 509th Composite Group temporarily painted 6th Bombardment Group's "Circle-R" for operational security,
  // plus USAAF serial "4486292" near fin top!
  ctx.fillStyle = "#171a1e";
  ctx.font = 'bold 30px "Arial Narrow", Impact, sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("4486292", 265, 96);

  // Large bold Circle-R in center of fin
  const cx = 262;
  const cy = 248;
  ctx.strokeStyle = "#15181c";
  ctx.lineWidth = 15;
  ctx.beginPath();
  ctx.arc(cx, cy, 86, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#15181c";
  ctx.font = 'bold 116px "Arial", Impact, sans-serif';
  ctx.textBaseline = "middle";
  ctx.fillText("R", cx, cy + 6);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createNoseNumber82Texture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 512, 256);

  // Tactical number "82" + "ENOLA GAY" slanted script
  ctx.fillStyle = "#15181c";
  ctx.font = 'bold 128px Impact, "Arial Black", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("82", 340, 150);

  ctx.save();
  ctx.translate(145, 165);
  ctx.rotate(-0.14);
  ctx.font = 'italic bold 36px "Trebuchet MS", Arial, sans-serif';
  ctx.fillText("ENOLA GAY", 0, 0);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Loft circular fuselage skin from z = -2.15m to +24.53m, cutting out bottom arc (-126°..+126° from top)
// along forward bomb bay [zStart, zEnd] so open bomb bay reveals full interior!
function buildFuselageShellGeometry(stations, bayStart, bayEnd) {
  const segZ = 48;
  const segA = 44;
  const zMin = stations[0].z;
  const zMax = stations[stations.length - 1].z;

  const sampleStation = (z) => {
    for (let i = 0; i < stations.length - 1; i++) {
      const a = stations[i];
      const b = stations[i + 1];
      if (z >= a.z && z <= b.z) {
        const u = (z - a.z) / Math.max(1e-5, b.z - a.z);
        const s = u * u * (3 - 2 * u);
        return {
          r: a.r + (b.r - a.r) * s,
          cy: a.cy + (b.cy - a.cy) * s,
        };
      }
    }
    const last = stations[stations.length - 1];
    return { r: last.r, cy: last.cy };
  };

  const positions = [];
  const uvs = [];
  const indices = [];

  for (let iz = 0; iz <= segZ; iz++) {
    const vz = iz / segZ;
    const z = zMin + vz * (zMax - zMin);
    const { r, cy } = sampleStation(z);
    for (let ia = 0; ia <= segA; ia++) {
      const u = ia / segA;
      // Angle 0 at top (+Y), +PI at bottom (-Y), sweeping full 2*PI
      const ang = (u - 0.5) * Math.PI * 2;
      const x = Math.sin(ang) * r;
      const y = cy + Math.cos(ang) * r;
      positions.push(x, y, z);
      uvs.push(u * 4.0, vz * 8.0);
    }
  }

  const row = segA + 1;
  for (let iz = 0; iz < segZ; iz++) {
    const z0 = zMin + (iz / segZ) * (zMax - zMin);
    const z1 = zMin + ((iz + 1) / segZ) * (zMax - zMin);
    const zMid = 0.5 * (z0 + z1);
    const inFwdBay = zMid >= bayStart && zMid <= bayEnd;

    for (let ia = 0; ia < segA; ia++) {
      const angMid = ((ia + 0.5) / segA - 0.5) * Math.PI * 2;
      // Bottom of fuselage corresponds to |angMid| > 124 deg (cos(ang) < -0.56)
      if (inFwdBay && Math.abs(angMid) > (124 * Math.PI) / 180) {
        continue;
      }
      // Tail gunner armored sighting canopy aperture (z >= 23.52m, wide +/-165 deg so -35..+18 deg view is 100% clear!)
      if (zMid >= 23.52 && Math.abs(angMid) <= (165 * Math.PI) / 180) {
        continue;
      }
      const a = iz * row + ia;
      const b = (iz + 1) * row + ia;
      const c = (iz + 1) * row + (ia + 1);
      const d = iz * row + (ia + 1);
      // Outward radial normal (+R): iz -> +Z, ia -> clockwise angle around +Z -> (a, b, c) points strictly OUTWARD!
      indices.push(a, b, c, a, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return { geom, sampleStation };
}

// Curved conformal fuselage decal mesh adhering +3mm outside fuselage skin
function buildFuselageDecal(sampleStation, zCenter, zLen, angCenterRad, angSpanRad) {
  const nz = 12;
  const na = 12;
  const pos = [];
  const uvs = [];
  const idx = [];

  for (let iz = 0; iz <= nz; iz++) {
    const vz = iz / nz;
    const z = zCenter + (vz - 0.5) * zLen;
    const { r, cy } = sampleStation(z);
    const ro = r + 0.005;
    for (let ia = 0; ia <= na; ia++) {
      const ua = ia / na;
      const ang = angCenterRad + (ua - 0.5) * angSpanRad;
      pos.push(Math.sin(ang) * ro, cy + Math.cos(ang) * ro, z);
      // Map UV cleanly: horizontal u along Z (fore-aft), vertical v along circumference (bottom-top)!
      uvs.push(angCenterRad < 0 ? vz : 1 - vz, angCenterRad < 0 ? ua : 1 - ua);
    }
  }
  const row = na + 1;
  for (let iz = 0; iz < nz; iz++) {
    for (let ia = 0; ia < na; ia++) {
      const a = iz * row + ia;
      const b = (iz + 1) * row + ia;
      const c = (iz + 1) * row + (ia + 1);
      const d = iz * row + (ia + 1);
      // Outward radial normal (+R): iz -> +Z, ia -> clockwise angle -> (a, b, c) points strictly OUTWARD!
      idx.push(a, b, c, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Curved clamshell bomb bay door (sideSign = -1 port, +1 starboard) hinged along +/-124° chine!
function buildBombBayDoorGeometry(r, zLen, sideSign) {
  const segA = 12;
  const segZ = 8;
  const hingeAng = sideSign * ((124 * Math.PI) / 180);
  const bottomAng = sideSign * Math.PI;

  const hingeX = Math.sin(hingeAng) * r;
  const hingeY = Math.cos(hingeAng) * r;

  const pos = [];
  const uvs = [];
  const idx = [];

  for (let iz = 0; iz <= segZ; iz++) {
    const vz = iz / segZ;
    const z = (vz - 0.5) * zLen;
    for (let ia = 0; ia <= segA; ia++) {
      const u = ia / segA;
      const ang = hingeAng + u * (bottomAng - hingeAng);
      pos.push(Math.sin(ang) * r - hingeX, Math.cos(ang) * r - hingeY, z);
      uvs.push(u, vz);
    }
  }
  const row = segA + 1;
  for (let iz = 0; iz < segZ; iz++) {
    for (let ia = 0; ia < segA; ia++) {
      const a = iz * row + ia;
      const b = (iz + 1) * row + ia;
      const c = (iz + 1) * row + (ia + 1);
      const d = iz * row + (ia + 1);
      // sideSign > 0: ang increases clockwise (+124 -> +180) so (a, b, c) points outward; sideSign < 0: ang decreases (-124 -> -180) so (a, c, b) points outward!
      if (sideSign > 0) idx.push(a, b, c, a, c, d);
      else idx.push(a, c, b, a, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geom: g, hingeX, hingeY };
}

// Lofted Boeing B-29 Vertical Tail Fin + Swept Dorsal Fin Fillet with NACA-0012 Airfoil Section
function buildBoeingVerticalFinGeometry(emp) {
  const spanSegs = 22;
  const profSegs = 24;
  const pos = [];
  const uvs = [];
  const idx = [];

  const yBase = 0.65;
  const yTop = emp.finTopY;

  for (let i = 0; i <= spanSegs; i++) {
    const v = i / spanSegs;
    const y = yBase + v * (yTop - yBase);

    // Swept dorsal fillet at bottom -> straight swept Boeing leading edge above y = 1.9m
    let leZ;
    if (v < 0.24) {
      const k = v / 0.24;
      leZ = emp.finRootZStart + (emp.finLEZ - emp.finRootZStart + 1.1) * Math.pow(k, 0.58);
    } else {
      const k = (v - 0.24) / 0.76;
      leZ = (emp.finLEZ - 0.15) + k * (emp.finTipZStart - (emp.finLEZ - 0.15));
    }
    const teZ = emp.finTEZ + v * (emp.finTipZEnd - emp.finTEZ);
    // Elliptical rounded fin tip cap
    const tipPinch = v > 0.92 ? Math.sqrt(Math.max(0.02, 1.0 - Math.pow((v - 0.92) / 0.08, 2))) : 1.0;
    const chord = Math.max(0.3, (teZ - leZ) * tipPinch);
    const zOffset = leZ + (teZ - leZ - chord) * 0.5;
    const thickRatio = 0.115 * (1.0 - 0.32 * v);

    for (let j = 0; j <= profSegs; j++) {
      const theta = (j / profSegs) * Math.PI * 2;
      const xc = 0.5 * (1.0 + Math.cos(theta));
      const yt =
        5.0 *
        thickRatio *
        (0.2969 * Math.sqrt(Math.max(0, xc)) -
          0.126 * xc -
          0.3516 * xc * xc +
          0.2843 * xc * xc * xc -
          0.1036 * xc * xc * xc * xc);
      const signSide = Math.sin(theta) >= 0 ? 1 : -1;
      const x = signSide * yt * chord;
      const z = zOffset + xc * chord;
      pos.push(x, y, z);
      // Map UV upright & left-to-right on both Port (-X) and Starboard (+X) vertical fin faces!
      uvs.push(signSide > 0 ? 1.0 - xc : xc, v);
    }
  }

  const ring = profSegs + 1;
  for (let i = 0; i < spanSegs; i++) {
    for (let j = 0; j < profSegs; j++) {
      const a = i * ring + j;
      const b = (i + 1) * ring + j;
      const c = (i + 1) * ring + (j + 1);
      const d = i * ring + (j + 1);
      // i increases +Y, theta in (0, PI) moves toward -Z on +X starboard face -> (a, c, b) points +X on starboard and -X on port!
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

function buildHorizontalStabSide(emp, sideSign) {
  const spanSegs = 14;
  const profSegs = 20;
  const pos = [];
  const uvs = [];
  const idx = [];
  const sweepTan = Math.tan((emp.hStabSweepDeg * Math.PI) / 180);

  for (let i = 0; i <= spanSegs; i++) {
    const s = i / spanSegs;
    const spanDist = 0.35 + s * (emp.hStabHalfSpan - 0.35);
    const x = sideSign * spanDist;
    const chord = emp.hStabRootChord + (emp.hStabTipChord - emp.hStabRootChord) * s;
    const leZ = emp.hStabRootLEZ + spanDist * sweepTan;
    const thickRatio = 0.11 * (1.0 - 0.25 * s);

    for (let j = 0; j <= profSegs; j++) {
      const theta = (j / profSegs) * Math.PI * 2;
      const xc = 0.5 * (1.0 + Math.cos(theta));
      const yt =
        5.0 *
        thickRatio *
        (0.2969 * Math.sqrt(Math.max(0, xc)) -
          0.126 * xc -
          0.3516 * xc * xc +
          0.2843 * xc * xc * xc -
          0.1036 * xc * xc * xc * xc);
      const signUp = Math.sin(theta) >= 0 ? 1 : -1;
      pos.push(x, emp.hStabY + signUp * yt * chord, leZ + xc * chord);
      uvs.push(s * 2.0, j / profSegs);
    }
  }

  const ring = profSegs + 1;
  for (let i = 0; i < spanSegs; i++) {
    for (let j = 0; j < profSegs; j++) {
      const a = i * ring + j;
      const b = (i + 1) * ring + j;
      const c = (i + 1) * ring + (j + 1);
      const d = i * ring + (j + 1);
      // theta in (0, PI) moves toward -Z (leading edge), so sideSign < 0 requires (a, c, b) for +Y upper normal!
      if (sideSign < 0) idx.push(a, c, b, a, d, c);
      else idx.push(a, b, c, a, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function buildLittleBoyMesh() {
  const g = new THREE.Group();
  const oliveMat = new THREE.MeshStandardMaterial({ color: 0x31392d, roughness: 0.54, metalness: 0.38 });
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e2226, roughness: 0.45, metalness: 0.68 });

  // Cylindrical gun-type casing (3.0m total length, 0.71m diameter)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.355, 0.355, 2.15, 24), oliveMat);
  body.rotation.x = Math.PI * 0.5;
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.355, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
    oliveMat
  );
  nose.rotation.x = -Math.PI * 0.5;
  nose.position.z = -1.075;

  // Tapered tail cone + iconic Mk-1 square sheet-metal box stabilizer fins + radar altimeter Yagi antennas!
  const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.355, 0.55, 20), oliveMat);
  tailCone.rotation.x = Math.PI * 0.5;
  tailCone.position.z = 1.35;

  const boxRing = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.56), oliveMat);
  boxRing.position.z = 1.48;
  const finH = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.03, 0.62), darkSteelMat);
  finH.position.z = 1.46;
  const finV = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.76, 0.62), darkSteelMat);
  finV.position.z = 1.46;

  // 4 Archie radar fuse nose/side whip antennas
  for (const sx of [-1, 1]) {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 6), darkSteelMat);
    ant.rotation.z = Math.PI * 0.5;
    ant.position.set(sx * 0.42, 0.08, -0.55);
    g.add(ant);
  }

  g.add(body, nose, tailCone, boxRing, finH, finV);
  return g;
}

export function createFuselageAndEmpennage(spec, alcladMat) {
  const group = new THREE.Group();
  const fus = spec.fuselage;
  const bay = fus.forwardBombBay;

  // 1. Main 30.18m Circular Alclad Fuselage Shell with Open Forward Bomb Bay Cutout
  const { geom: shellGeom, sampleStation } = buildFuselageShellGeometry(
    fus.stations,
    bay.zStart,
    bay.zEnd
  );
  const doubleAlcladMat = alcladMat.clone();
  doubleAlcladMat.side = THREE.DoubleSide;
  const fuselageMesh = new THREE.Mesh(shellGeom, alcladMat);
  group.add(fuselageMesh);

  // 2. Wing-Fuselage Aerodynamic Fillets (Port & Starboard)
  const filletMat = alcladMat;
  for (const side of [-1, 1]) {
    const fillet = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 4.8, 8, 16), filletMat);
    fillet.rotation.x = Math.PI * 0.5;
    fillet.scale.set(0.65, 1.0, 0.85);
    fillet.position.set(side * 1.32, -0.02, 1.95);
    group.add(fillet);
  }

  // 3. Silverplate Flush Turret Delete Fairings, Astrodome & Side Blisters
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x22282b, roughness: 0.48, metalness: 0.68 });
  const zincChromateMat = new THREE.MeshStandardMaterial({
    color: 0x4b5938,
    roughness: 0.72,
    metalness: 0.25,
    side: THREE.DoubleSide,
  });
  const glassBlisterMat = new THREE.MeshPhysicalMaterial({
    color: 0xcfe4f5,
    transparent: true,
    opacity: 0.32,
    roughness: 0.1,
    metalness: 0.1,
  });

  // Navigator Astrodome & Flush Silverplate Upper/Lower Turret Fairing Covers
  const astrodome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), glassBlisterMat);
  astrodome.position.set(0, 1.44, -1.72);
  group.add(astrodome);

  const dorsalCap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.54, 0.08, 20), alcladMat);
  dorsalCap1.position.set(0, 1.44, -0.25);
  const dorsalCap2 = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.50, 0.08, 20), alcladMat);
  dorsalCap2.position.set(0, 1.36, 11.4);
  group.add(dorsalCap1, dorsalCap2);

  // Waist pressurized circular observation blisters (Port & Starboard)
  for (const side of [-1, 1]) {
    const blister = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), glassBlisterMat);
    blister.scale.set(0.45, 0.85, 0.85);
    blister.position.set(side * 1.34, 0.22, 12.6);
    group.add(blister);
  }

  // 4. Conformal Fuselage Nose Tactical "#82 / ENOLA GAY" & Rear Star-and-Bars Markings!
  const nose82Mat = new THREE.MeshStandardMaterial({
    map: createNoseNumber82Texture(),
    transparent: true,
    roughness: 0.35,
    metalness: 0.35,
  });
  const portNoseDecal = new THREE.Mesh(buildFuselageDecal(sampleStation, -1.42, 1.60, -Math.PI * 0.42, 0.70), nose82Mat);
  const stbdNoseDecal = new THREE.Mesh(buildFuselageDecal(sampleStation, -1.42, 1.60, Math.PI * 0.42, 0.70), nose82Mat);
  group.add(portNoseDecal, stbdNoseDecal);

  const insigMat = new THREE.MeshStandardMaterial({
    map: createStarAndBarsTexture(),
    transparent: true,
    roughness: 0.38,
    metalness: 0.32,
  });
  const portFusInsig = new THREE.Mesh(buildFuselageDecal(sampleStation, 14.1, 2.35, -Math.PI * 0.48, 0.72), insigMat);
  const stbdFusInsig = new THREE.Mesh(buildFuselageDecal(sampleStation, 14.1, 2.35, Math.PI * 0.48, 0.72), insigMat);
  group.add(portFusInsig, stbdFusInsig);

  // 5. Openable Forward Bomb Bay Interior, Crew Crawl Tunnel, Suspension Shackle & Twin Clamshell Doors!
  const bayLen = bay.zEnd - bay.zStart;
  const bayMidZ = 0.5 * (bay.zStart + bay.zEnd);

  // Interior zinc-chromate roof & bulkheads
  const bayRoof = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.06, bayLen), zincChromateMat);
  bayRoof.position.set(0, 0.28, bayMidZ);
  const bayFwdWall = new THREE.Mesh(new THREE.CircleGeometry(1.44, 24), zincChromateMat);
  bayFwdWall.position.set(0, 0, bay.zStart);
  const bayAftWall = new THREE.Mesh(new THREE.CircleGeometry(1.44, 24), zincChromateMat);
  bayAftWall.rotation.y = Math.PI;
  bayAftWall.position.set(0, 0, bay.zEnd);
  // Iconic B-29 pressurized upper-starboard crew crawl tunnel spanning the bomb bay!
  const crawlTunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, bayLen + 0.2, 16), zincChromateMat);
  crawlTunnel.rotation.x = Math.PI * 0.5;
  crawlTunnel.position.set(0.62, 0.72, bayMidZ);
  // Bomb suspension H-rack
  const bombShackle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 1.85), darkMetalMat);
  bombShackle.position.set(-0.18, 0.05, bayMidZ - 0.15);
  group.add(bayRoof, bayFwdWall, bayAftWall, crawlTunnel, bombShackle);

  // Captive / Releasing Little Boy inside Forward Bomb Bay (seamless handoff to World Bomb after clearing doors!)
  const bayBomb = buildLittleBoyMesh();
  bayBomb.position.set(-0.18, -0.34, bayMidZ - 0.15);
  group.add(bayBomb);

  // Twin Clamshell Bomb Bay Doors
  const leftDoorSpec = buildBombBayDoorGeometry(1.46, bayLen, -1);
  const leftDoorMesh = new THREE.Mesh(leftDoorSpec.geom, doubleAlcladMat);
  const leftDoorPivot = new THREE.Group();
  leftDoorPivot.position.set(leftDoorSpec.hingeX, leftDoorSpec.hingeY, bayMidZ);
  leftDoorPivot.add(leftDoorMesh);

  const rightDoorSpec = buildBombBayDoorGeometry(1.46, bayLen, +1);
  const rightDoorMesh = new THREE.Mesh(rightDoorSpec.geom, doubleAlcladMat);
  const rightDoorPivot = new THREE.Group();
  rightDoorPivot.position.set(rightDoorSpec.hingeX, rightDoorSpec.hingeY, bayMidZ);
  rightDoorPivot.add(rightDoorMesh);
  group.add(leftDoorPivot, rightDoorPivot);

  // 6. Towering Boeing B-29 Vertical Tail Fin ("Circle-R") & Swept Horizontal Stabilizers
  const finMat = new THREE.MeshStandardMaterial({
    map: createTailFinTexture(),
    color: 0xdce4ec,
    metalness: 0.50,
    roughness: 0.28,
  });
  const verticalFin = new THREE.Mesh(buildBoeingVerticalFinGeometry(fus.empennage), finMat);
  const leftHStab = new THREE.Mesh(buildHorizontalStabSide(fus.empennage, -1), alcladMat);
  const rightHStab = new THREE.Mesh(buildHorizontalStabSide(fus.empennage, +1), alcladMat);
  group.add(verticalFin, leftHStab, rightHStab);

  // 7. Tail Gunner Pressurized Compartment & Twin .50-Caliber M2 Browning Turret (Station 3 · Sgt. Bob Caron!)
  const tailStation = new THREE.Group();
  const quiltTailMat = new THREE.MeshStandardMaterial({
    color: 0x2a3325,
    roughness: 0.88,
    metalness: 0.06,
    side: THREE.DoubleSide,
  });
  const frameTailMat = new THREE.MeshStandardMaterial({ color: 0x293027, roughness: 0.5, metalness: 0.65 });

  // Enclosed interior cabin cylinder from z = +22.38m to +23.54m (strictly inside tapered Alclad tail cone!)
  const tailWall = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.62, 1.16, 24, 1, true),
    quiltTailMat
  );
  tailWall.rotation.x = Math.PI * 0.5;
  tailWall.position.set(0, 0.25, 22.96);
  tailStation.add(tailWall);

  // Forward bulkhead behind tail gunner's back (z = +22.38m)
  const tailFwdBulk = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), quiltTailMat);
  tailFwdBulk.position.set(0, 0.24, 22.38);
  tailStation.add(tailFwdBulk);

  // Tail gunner glazed exterior canopy cone + framing struts around rear armored sighting window (100% clear sightline!)
  const tailGlassCone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.31, 0.52, 0.88, 24, 1, true),
    glassBlisterMat
  );
  tailGlassCone.rotation.x = Math.PI * 0.5;
  tailGlassCone.position.set(0, 0.27, 24.02);
  tailStation.add(tailGlassCone);

  const rearRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.016, 10, 28), frameTailMat);
  rearRing.position.set(0, 0.24, 24.44);
  tailStation.add(rearRing);

  for (const angDeg of [-148, -108, -42, 42, 108, 148]) {
    const a = (angDeg * Math.PI) / 180;
    const p0 = new THREE.Vector3(Math.sin(a) * 0.54, 0.25 + Math.cos(a) * 0.54, 23.54);
    const p1 = new THREE.Vector3(Math.sin(a) * 0.36, 0.24 + Math.cos(a) * 0.36, 24.44);
    const dir = new THREE.Vector3().subVectors(p1, p0);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, dir.length(), 8), frameTailMat);
    strut.position.addVectors(p0, p1).multiplyScalar(0.5);
    strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    tailStation.add(strut);
  }

  // N-8 Illuminated Optical Ring Sight suspended at upper sightline (y = 0.38, z = 24.28)
  const sightBracket = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.11, 0.022), darkMetalMat);
  sightBracket.position.set(0, 0.49, 24.28);
  const sightRing = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.0036, 8, 24), darkMetalMat);
  sightRing.position.set(0, 0.38, 24.28);
  const reticleCrossH = new THREE.Mesh(
    new THREE.BoxGeometry(0.078, 0.0014, 0.001),
    new THREE.MeshBasicMaterial({ color: 0xffb85c })
  );
  reticleCrossH.position.set(0, 0.38, 24.28);
  const reticleCrossV = new THREE.Mesh(
    new THREE.BoxGeometry(0.0014, 0.078, 0.001),
    reticleCrossH.material
  );
  reticleCrossV.position.set(0, 0.38, 24.28);
  tailStation.add(sightBracket, sightRing, reticleCrossH, reticleCrossV);

  // Twin .50-Caliber M2 Browning Turret mounted cleanly BELOW tail gunner observation window (y = -0.15, z = 24.38)!
  const gunPivot = new THREE.Group();
  gunPivot.position.set(0, -0.15, 24.38);
  const gunMantlet = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), darkMetalMat);
  gunMantlet.scale.set(1.25, 0.80, 0.9);
  gunPivot.add(gunMantlet);

  for (const gx of [-0.105, 0.105]) {
    const jacket = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.58, 12), darkMetalMat);
    jacket.rotation.x = Math.PI * 0.5;
    jacket.position.set(gx, 0.0, 0.32);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.92, 10), darkMetalMat);
    barrel.rotation.x = Math.PI * 0.5;
    barrel.position.set(gx, 0.0, 0.52);
    const flashHider = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.013, 0.08, 10), darkMetalMat);
    flashHider.rotation.x = Math.PI * 0.5;
    flashHider.position.set(gx, 0.0, 0.98);
    gunPivot.add(jacket, barrel, flashHider);
  }
  tailStation.add(gunPivot);
  group.add(tailStation);

  return {
    group,
    auditRefs: {
      fuselageMesh,
      portNoseDecal,
      stbdNoseDecal,
      portFusInsig,
      stbdFusInsig,
      leftDoorMesh,
      rightDoorMesh,
      verticalFin,
      leftHStab,
      rightHStab,
    },
    update(flightState) {
      // Smoothly swing open/close forward clamshell bomb bay doors!
      const openAngle = flightState.bombBayOpenRatio * 1.32;
      leftDoorPivot.rotation.z = -openAngle;
      rightDoorPivot.rotation.z = openAngle;

      // Animate Little Boy inside/exiting forward bomb bay for first 2.2s of drop
      const b = flightState.bomb;
      bayBomb.visible = b.visibleInBay;
      if (b.visibleInBay) {
        bayBomb.position.set(-0.18, -0.34 - b.bayDropOffsetM, bayMidZ - 0.15);
        bayBomb.rotation.x = b.released ? -Math.min(0.25, b.bayDropOffsetM * 0.01) : 0.0;
      }

      // Subtle twin .50-cal elevation tracking depressed cleanly into lower 1/4 of tail gunner sightline
      gunPivot.rotation.x = 0.34 + 0.022 * Math.sin(flightState.time * 0.35);
    },
  };
}
