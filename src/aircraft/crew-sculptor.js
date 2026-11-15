import * as THREE from "../../vendor/three.module.js";

// Procedural Anatomical & WWII USAAF Aviator Sculpting Module (Zero External Binary Assets)
// Replaces primitive spheres/capsules with craniofacial sculpted heads, A-11 leather helmets,
// AN-H-15 headset earcups, contoured B-8 goggles, A-14 oxygen masks, B-15 mouton-collar flight jackets,
// B-4 "Mae West" life vests, white parachute harnesses, wrinkled sleeves & 5-finger B-3 leather gloves.

function createHumanFaceTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d");

  // Warm realistic Caucasian aviator skin base with subsurface-like warmth on cheeks/nose
  const baseGrad = ctx.createLinearGradient(0, 0, 0, 512);
  baseGrad.addColorStop(0.0, "#c89678");
  baseGrad.addColorStop(0.42, "#d7a688");
  baseGrad.addColorStop(0.68, "#cca084");
  baseGrad.addColorStop(1.0, "#ad7f65");
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle skin micro-grain & warm cheek/nose flush (u=0.5 is front face center -Z, v=0.52 is eye line)
  const cheekFlush = (cx, cy, rx, ry, col) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, rx);
    g.addColorStop(0, col);
    g.addColorStop(1, "rgba(200,120,100,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  cheekFlush(212, 276, 36, 26, "rgba(196, 102, 86, 0.28)");
  cheekFlush(300, 276, 36, 26, "rgba(196, 102, 86, 0.28)");
  cheekFlush(256, 268, 22, 34, "rgba(205, 118, 96, 0.22)");

  // Subtle jaw / chin five-o'clock stubble shadow
  cheekFlush(256, 355, 76, 48, "rgba(72, 58, 52, 0.16)");

  // Recessed orbital eye sockets
  cheekFlush(224, 238, 24, 16, "rgba(88, 54, 42, 0.34)");
  cheekFlush(288, 238, 24, 16, "rgba(88, 54, 42, 0.34)");

  // Eyebrows (expressive focused aviator brows)
  ctx.strokeStyle = "rgba(58, 40, 28, 0.85)";
  ctx.lineWidth = 6.5;
  ctx.lineCap = "round";
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(256 + s * 14, 222);
    ctx.quadraticCurveTo(256 + s * 32, 215, 256 + s * 50, 224);
    ctx.stroke();
  }

  // Realistic Eyes (sclera, hazel-blue iris, pupil, upper lash crease & catchlight)
  for (const s of [-1, 1]) {
    const ex = 256 + s * 31;
    const ey = 239;
    ctx.fillStyle = "#ebe6df";
    ctx.beginPath();
    ctx.ellipse(ex, ey, 12.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#485b63";
    ctx.beginPath();
    ctx.arc(ex, ey, 5.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#141618";
    ctx.beginPath();
    ctx.arc(ex, ey, 2.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(ex - 1.8, ey - 1.8, 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(46, 30, 24, 0.82)";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 13.0, 6.8, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  // Nose bridge highlight & nostrils
  ctx.strokeStyle = "rgba(248, 218, 198, 0.42)";
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(256, 232);
  ctx.lineTo(256, 278);
  ctx.stroke();

  ctx.fillStyle = "rgba(78, 44, 34, 0.58)";
  ctx.beginPath();
  ctx.ellipse(249, 287, 4.2, 2.6, 0.3, 0, Math.PI * 2);
  ctx.ellipse(263, 287, 4.2, 2.6, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Mouth / lips (visible when oxygen mask is off or angled)
  ctx.fillStyle = "rgba(156, 88, 78, 0.72)";
  ctx.beginPath();
  ctx.ellipse(256, 316, 18, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(92, 46, 38, 0.65)";
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(237, 316);
  ctx.quadraticCurveTo(256, 318, 275, 316);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createB15JacketTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#5c5941";
  ctx.fillRect(0, 0, 512, 512);

  // Cotton sateen cloth weave + natural arm/torso wrinkle shading
  for (let y = 0; y < 512; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? "rgba(255,255,240,0.03)" : "rgba(0,0,0,0.035)";
    ctx.fillRect(0, y, 512, 1.5);
  }
  for (let i = 0; i < 28; i++) {
    const y = 35 + i * 16;
    const g = ctx.createLinearGradient(0, y - 6, 0, y + 6);
    g.addColorStop(0, "rgba(30,30,20,0.0)");
    g.addColorStop(0.5, i % 2 === 0 ? "rgba(28,28,18,0.16)" : "rgba(215,210,185,0.08)");
    g.addColorStop(1, "rgba(30,30,20,0.0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 6, 512, 12);
  }

  // Front offset B-15 brass zipper placket & stitched seams (around u = 0.5 -> x = 256)
  ctx.strokeStyle = "#3c3a29";
  ctx.lineWidth = 4;
  ctx.strokeRect(246, 20, 20, 472);
  ctx.strokeStyle = "#9c8b56";
  ctx.lineWidth = 2.2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(256, 24);
  ctx.lineTo(256, 488);
  ctx.stroke();
  ctx.setLineDash([]);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLeatherHelmetTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#462b1b";
  ctx.fillRect(0, 0, 256, 256);

  // Subtle seal-brown horsehide grain & stitched A-11 helmet panel seams
  for (let i = 0; i < 900; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,220,190,0.04)" : "rgba(15,8,4,0.08)";
    ctx.fillRect(x, y, 3, 3);
  }
  ctx.strokeStyle = "#2b190f";
  ctx.lineWidth = 3.0;
  for (const sx of [64, 128, 192]) {
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, 256);
    ctx.stroke();
  }
  ctx.strokeStyle = "#6e4932";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([3, 3]);
  for (const sx of [61, 67, 125, 131, 189, 195]) {
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, 256);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createAviatorMaterials() {
  const faceTex = createHumanFaceTexture();
  const jacketTex = createB15JacketTexture();
  const leatherTex = createLeatherHelmetTexture();

  return {
    skinMat: new THREE.MeshStandardMaterial({
      map: faceTex,
      roughness: 0.62,
      metalness: 0.02,
    }),
    helmetLeatherMat: new THREE.MeshStandardMaterial({
      map: leatherTex,
      roughness: 0.52,
      metalness: 0.08,
    }),
    gloveLeatherMat: new THREE.MeshStandardMaterial({
      map: leatherTex,
      color: 0x613c26,
      roughness: 0.56,
      metalness: 0.06,
    }),
    shearlingMat: new THREE.MeshStandardMaterial({
      color: 0xbfa37a,
      roughness: 0.94,
      metalness: 0.0,
    }),
    moutonCollarMat: new THREE.MeshStandardMaterial({
      color: 0x5c3e26,
      roughness: 0.92,
      metalness: 0.0,
    }),
    jacketMat: new THREE.MeshStandardMaterial({
      map: jacketTex,
      roughness: 0.80,
      metalness: 0.03,
    }),
    maeWestMat: new THREE.MeshStandardMaterial({
      color: 0xd4a22a,
      roughness: 0.66,
      metalness: 0.04,
    }),
    harnessWebMat: new THREE.MeshStandardMaterial({
      color: 0xd8d3c4,
      roughness: 0.82,
      metalness: 0.04,
    }),
    rubberDarkMat: new THREE.MeshStandardMaterial({
      color: 0x1c211e,
      roughness: 0.68,
      metalness: 0.10,
    }),
    oxyMaskMat: new THREE.MeshStandardMaterial({
      color: 0x263327,
      roughness: 0.62,
      metalness: 0.08,
    }),
    goggleGlassMat: new THREE.MeshStandardMaterial({
      color: 0x18262e,
      roughness: 0.10,
      metalness: 0.88,
    }),
    buckleMetalMat: new THREE.MeshStandardMaterial({
      color: 0xc2cad2,
      roughness: 0.28,
      metalness: 0.85,
    }),
  };
}

// Sculpted craniofacial head + neck mesh: brow ridge, orbital sockets, projecting nose bridge,
// zygomatic cheekbones, tapered jaw/chin, and cylindrical muscular neck!
function buildAnatomicalHeadGeometry() {
  const segU = 36;
  const segV = 28;
  const pos = [];
  const uvs = [];
  const idx = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV; // 0 = crown top (+Y), 1 = base of neck (-Y)
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      // azim = 0 at front (-Z), +PI/2 at right (+X), -PI/2 at left (-X), +-PI at back (+Z)
      const azim = (u - 0.5) * Math.PI * 2;
      const ca = Math.cos(azim); // +1 at front face (-Z), -1 at occiput (+Z)
      const sa = Math.sin(azim);

      let y, rx, rz, zShift = 0.0;
      if (v <= 0.78) {
        // Cranium & Face (v in 0..0.78 -> polar phi in 0..0.88*PI)
        const vp = v / 0.78;
        const phi = vp * Math.PI * 0.88;
        const sp = Math.sin(phi);
        const cp = Math.cos(phi);

        y = 0.02 + cp * 0.118;
        rx = 0.084 * sp;
        rz = 0.098 * sp;

        // Taper lower jaw & chin naturally (vp > 0.56)
        if (vp > 0.56) {
          const jawT = (vp - 0.56) / 0.44;
          rx *= 1.0 - 0.28 * jawT;
          rz *= 1.0 - 0.14 * jawT;
          // Project chin slightly forward (-Z)
          zShift -= Math.max(0, ca) * Math.sin(jawT * Math.PI) * 0.012;
        }

        // Zygomatic cheekbones (+-38 deg azimuth around vp = 0.54)
        const cheekBand = Math.exp(-Math.pow((vp - 0.55) / 0.11, 2.0));
        const cheekAz = Math.exp(-Math.pow((Math.abs(azim) - 0.66) / 0.34, 2.0));
        rx += 0.0085 * cheekBand * cheekAz;
        zShift -= 0.006 * cheekBand * cheekAz;

        // Supraorbital brow ridge (vp = 0.42) & recessed eye sockets (vp = 0.47, |azim| ~ 0.34)
        const browBand = Math.exp(-Math.pow((vp - 0.41) / 0.055, 2.0)) * Math.max(0, ca);
        zShift -= 0.0075 * browBand;
        const socketBand = Math.exp(-Math.pow((vp - 0.475) / 0.055, 2.0));
        const socketAz = Math.exp(-Math.pow((Math.abs(azim) - 0.32) / 0.16, 2.0));
        zShift += 0.0085 * socketBand * socketAz;

        // Projecting anatomical human nose bridge & tip (|azim| < 0.22, vp in 0.44..0.62)
        const noseAz = Math.exp(-Math.pow(azim / 0.14, 2.0));
        const noseBridge = Math.exp(-Math.pow((vp - 0.555) / 0.085, 2.0));
        zShift -= 0.022 * noseAz * noseBridge;
      } else {
        // Muscular neck transitioning from jaw/occiput down into collar (v in 0.78..1.0)
        const vn = (v - 0.78) / 0.22;
        y = -0.090 - vn * 0.075;
        rx = 0.054 + vn * 0.012;
        rz = 0.058 + vn * 0.012;
        zShift = 0.012;
      }

      const x = sa * rx;
      const z = -ca * rz + zShift;
      pos.push(x, y, z);
      uvs.push(u, 1.0 - v);
    }
  }

  const row = segU + 1;
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * row + iu;
      const b = (iv + 1) * row + iu;
      const c = (iv + 1) * row + (iu + 1);
      const d = iv * row + (iu + 1);
      // Outward normal: iv goes down (-Y), iu goes clockwise from -Z -> +X -> +Z -> -X -> (a, c, b) is outward!
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

// Form-fitting A-11 Leather Flying Helmet shell covering cranium, temples, and nape while exposing face!
function buildA11HelmetShellGeometry() {
  const segU = 32;
  const segV = 18;
  const pos = [];
  const uvs = [];
  const idx = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV;
    const phi = v * Math.PI * 0.78;
    const sp = Math.sin(phi);
    const cp = Math.cos(phi);

    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const azim = (u - 0.5) * Math.PI * 2;
      const ca = Math.cos(azim);
      const sa = Math.sin(azim);

      // Cut high across forehead in front (ca > 0.38) so brows, eyes, nose & cheeks are visible!
      const frontCut = Math.max(0, (ca - 0.25) / 0.75);
      const effPhi = phi * (1.0 - 0.56 * frontCut * frontCut);
      const esp = Math.sin(effPhi);
      const ecp = Math.cos(effPhi);

      const rx = 0.088 * esp;
      const rz = 0.103 * esp;
      const y = 0.022 + ecp * 0.122;
      const x = sa * rx;
      const z = -ca * rz + (ca < 0 ? 0.004 : -0.002);

      pos.push(x, y, z);
      uvs.push(u * 2.0, v * 1.5);
    }
  }

  const row = segU + 1;
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * row + iu;
      const b = (iv + 1) * row + iu;
      const c = (iv + 1) * row + (iu + 1);
      const d = iv * row + (iu + 1);
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

let _cachedHeadGeom = null;
let _cachedHelmetGeom = null;
let _cachedTorsoGeom = null;

// Build complete WWII USAAF Aviator Head (Anatomical Face + A-11 Helmet + AN-H-15 Earcups + B-8 Goggles + Optional A-14 Oxygen Mask)
export function buildSculptedAviatorHead(mats, options = {}) {
  const {
    gogglesDown = false, // false = B-8 goggles perched authentically on forehead showing eyes & brow!
    wearOxygenMask = true,
    hoseEndLocal = null,
  } = options;

  if (!_cachedHeadGeom) _cachedHeadGeom = buildAnatomicalHeadGeometry();
  if (!_cachedHelmetGeom) _cachedHelmetGeom = buildA11HelmetShellGeometry();

  const headGroup = new THREE.Group();

  // 1. Anatomical Craniofacial Head & Neck
  const faceMesh = new THREE.Mesh(_cachedHeadGeom, mats.skinMat);
  headGroup.add(faceMesh);

  // 2. Stitched Seal-Brown A-11 Leather Flying Helmet
  const helmetMesh = new THREE.Mesh(_cachedHelmetGeom, mats.helmetLeatherMat);
  headGroup.add(helmetMesh);

  // Twin AN-H-15 Black Molded Rubber Radio Headset Earcups on Left & Right Temples!
  for (const s of [-1, 1]) {
    const earCup = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.036, 0.026, 16), mats.rubberDarkMat);
    earCup.rotation.z = Math.PI * 0.5;
    earCup.position.set(s * 0.088, 0.012, 0.006);
    const earCap = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), mats.helmetLeatherMat);
    earCap.scale.set(0.45, 1.0, 1.0);
    earCap.position.set(s * 0.098, 0.012, 0.006);
    headGroup.add(earCup, earCap);
  }

  // Helmet leather chin strap under jaw
  const chinStrap = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.0055, 6, 16, Math.PI), mats.helmetLeatherMat);
  chinStrap.rotation.z = Math.PI;
  chinStrap.position.set(0, -0.052, -0.028);
  headGroup.add(chinStrap);

  // 3. Contoured Twin-Lens B-8 Flying Goggles + Wrap-Around Elastic Headband
  const goggleRig = new THREE.Group();
  for (const s of [-1, 1]) {
    const frameRing = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.0058, 8, 18), mats.rubberDarkMat);
    frameRing.scale.set(1.22, 0.90, 1.0);
    frameRing.position.set(s * 0.033, 0, -0.096);
    frameRing.rotation.y = -s * 0.24;

    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.024, 16), mats.goggleGlassMat);
    lens.scale.set(1.20, 0.88, 1.0);
    lens.position.set(s * 0.033, 0, -0.099);
    lens.rotation.y = s * Math.PI - s * 0.24; // Face outward (-Z)!
    lens.rotation.y = Math.PI - s * 0.24;

    goggleRig.add(frameRing, lens);
  }
  const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.008, 0.012), mats.buckleMetalMat);
  noseBridge.position.set(0, 0.004, -0.100);
  goggleRig.add(noseBridge);

  if (gogglesDown) {
    goggleRig.position.set(0, 0.024, 0.002);
  } else {
    // Perched on helmet forehead so realistic eyes, eyebrows & cheekbones are clearly visible!
    goggleRig.position.set(0, 0.074, 0.014);
    goggleRig.rotation.x = 0.32;
  }

  // Helmet-hugging olive-khaki elastic goggle strap fitted snugly onto the A-11 leather shell (0.0mm air gap!)
  const goggleStrapMat = new THREE.MeshStandardMaterial({
    color: 0x5c5540,
    roughness: 0.86,
    metalness: 0.03,
  });
  const strapYFront = gogglesDown ? 0.024 : 0.072;
  const strapZFront = gogglesDown ? -0.074 : -0.062;
  const strapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.062, strapYFront, strapZFront),
    new THREE.Vector3(-0.085, 0.042, -0.010),
    new THREE.Vector3(-0.076, 0.026, 0.068),
    new THREE.Vector3(0.0, 0.022, 0.101),
    new THREE.Vector3(0.076, 0.026, 0.068),
    new THREE.Vector3(0.085, 0.042, -0.010),
    new THREE.Vector3(0.062, strapYFront, strapZFront),
  ]);
  const strapBand = new THREE.Mesh(new THREE.TubeGeometry(strapCurve, 24, 0.0052, 8, false), goggleStrapMat);
  headGroup.add(goggleRig, strapBand);

  // 4. Sculpted A-14 Demand Oxygen Mask + Bayonet Side Straps + Corrugated Hose
  if (wearOxygenMask) {
    const maskGroup = new THREE.Group();
    // Contoured nasal-oral rubber facepiece
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.046, 16, 12), mats.oxyMaskMat);
    cup.scale.set(0.86, 1.05, 1.18);
    cup.position.set(0, -0.036, -0.088);
    maskGroup.add(cup);

    // Nose pinch bridge & side microphone/check-valve bosses
    const pinch = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.024, 0.042, 10), mats.oxyMaskMat);
    pinch.position.set(0, -0.008, -0.106);
    pinch.rotation.x = 0.42;
    maskGroup.add(pinch);

    for (const s of [-1, 1]) {
      const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.012, 12), mats.rubberDarkMat);
      valve.rotation.z = Math.PI * 0.5;
      valve.position.set(s * 0.038, -0.038, -0.092);
      const snapStrap = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, 0.078), mats.oxyMaskMat);
      snapStrap.position.set(s * 0.064, -0.022, -0.048);
      snapStrap.rotation.y = -s * 0.44;
      snapStrap.rotation.x = 0.25;
      maskGroup.add(valve, snapStrap);
    }

    if (hoseEndLocal) {
      const hoseCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.072, -0.112),
        new THREE.Vector3(hoseEndLocal.x * 0.30, -0.18, -0.095),
        new THREE.Vector3(hoseEndLocal.x * 0.72, -0.30, -0.035),
        hoseEndLocal,
      ]);
      const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 18, 0.014, 10, false), mats.oxyMaskMat);
      maskGroup.add(hose);
    }
    headGroup.add(maskGroup);
  }

  return headGroup;
}

// Multi-station anatomical human torso loft (pelvis -> waist -> chest -> broad deltoid shoulders -> collar)
function buildAnatomicalTorsoGeometry() {
  const rings = [
    { y: -0.22, rx: 0.165, rz: 0.118, zOff: 0.01 }, // Seated hips
    { y: -0.12, rx: 0.152, rz: 0.112, zOff: 0.00 }, // Waist
    { y: 0.00, rx: 0.172, rz: 0.126, zOff: -0.008 }, // Lower ribcage
    { y: 0.11, rx: 0.196, rz: 0.132, zOff: -0.010 }, // Broad chest / pectorals
    { y: 0.18, rx: 0.212, rz: 0.122, zOff: 0.00 }, // Deltoid shoulder line
    { y: 0.23, rx: 0.115, rz: 0.088, zOff: 0.008 }, // Trapezius slope
    { y: 0.26, rx: 0.072, rz: 0.068, zOff: 0.012 }, // Neck collar ring
  ];
  const segU = 28;
  const pos = [];
  const uvs = [];
  const idx = [];

  for (let ir = 0; ir < rings.length; ir++) {
    const r = rings[ir];
    const v = ir / (rings.length - 1);
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const ang = (u - 0.5) * Math.PI * 2;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      // Slight spine hollow in back (+Z) & pectoral contour in front (-Z)
      const chestShape = 1.0 + 0.05 * Math.cos(ang * 2.0);
      const x = sa * r.rx * chestShape;
      const z = -ca * r.rz + r.zOff;
      pos.push(x, r.y, z);
      uvs.push(u, v);
    }
  }

  const row = segU + 1;
  for (let ir = 0; ir < rings.length - 1; ir++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = ir * row + iu;
      const b = (ir + 1) * row + iu;
      const c = (ir + 1) * row + (iu + 1);
      const d = ir * row + (iu + 1);
      // ir goes UP (+Y), iu goes clockwise (-Z -> +X -> +Z -> -X) -> (a, b, c) is outward!
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

export function buildSculptedAviatorTorso(mats) {
  if (!_cachedTorsoGeom) _cachedTorsoGeom = buildAnatomicalTorsoGeometry();

  const torso = new THREE.Group();

  // 1. Sculpted B-15 Olive-Drab Flight Jacket Torso
  const jacketMesh = new THREE.Mesh(_cachedTorsoGeom, mats.jacketMat);
  torso.add(jacketMesh);

  // 2. Plush B-15 Mouton Fur Collar wrapping around back & sides of neck!
  const furCollar = new THREE.Mesh(
    new THREE.TorusGeometry(0.088, 0.028, 10, 22, Math.PI * 1.48),
    mats.moutonCollarMat
  );
  furCollar.rotation.x = Math.PI * 0.5 + 0.18;
  furCollar.rotation.z = -Math.PI * 0.24;
  furCollar.position.set(0, 0.235, 0.010);
  torso.add(furCollar);

  // 3. Contoured B-4 "Mae West" Yellow Horse-Collar Life Preserver
  const vestCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.088, -0.08, -0.125),
    new THREE.Vector3(-0.098, 0.07, -0.132),
    new THREE.Vector3(-0.078, 0.21, -0.075),
    new THREE.Vector3(0.0, 0.255, 0.048),
    new THREE.Vector3(0.078, 0.21, -0.075),
    new THREE.Vector3(0.098, 0.07, -0.132),
    new THREE.Vector3(0.088, -0.08, -0.125),
  ]);
  const vestLobe = new THREE.Mesh(new THREE.TubeGeometry(vestCurve, 28, 0.042, 12, false), mats.maeWestMat);
  vestLobe.scale.set(1.0, 1.0, 0.62);
  torso.add(vestLobe);

  // Lower Mae West waist bladder pads
  for (const s of [-1, 1]) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.11, 0.036), mats.maeWestMat);
    pad.position.set(s * 0.074, -0.08, -0.122);
    pad.rotation.y = -s * 0.18;
    torso.add(pad);
  }

  // 4. USAAF White Canvas Parachute Harness Straps + Chrome Quick-Release Chest Box!
  for (const s of [-1, 1]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.31, 0.012), mats.harnessWebMat);
    strap.position.set(s * 0.068, 0.05, -0.136);
    strap.rotation.z = -s * 0.08;
    strap.rotation.x = 0.08;
    torso.add(strap);
  }
  const chestStrap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.032, 0.014), mats.harnessWebMat);
  chestStrap.position.set(0, 0.03, -0.142);
  const qrBox = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.016, 16), mats.buckleMetalMat);
  qrBox.rotation.x = Math.PI * 0.5;
  qrBox.position.set(0, 0.03, -0.148);
  torso.add(chestStrap, qrBox);

  return torso;
}

// Wrinkled cloth flight-jacket sleeve geometry (unit length 1.0 centered at y=0, from y=-0.5 to +0.5)
export function buildWrinkledSleeveGeometry(rProximal, rDistal, len) {
  const rings = 14;
  const segU = 18;
  const pos = [];
  const uvs = [];
  const idx = [];

  for (let ir = 0; ir <= rings; ir++) {
    const v = ir / rings;
    const y = (v - 0.5) * len;
    // Subtle cloth bunching ripples near elbow/wrist + anatomical biceps/forearm muscle belly
    const muscleBelly = Math.sin(v * Math.PI) * 0.0055;
    const clothFolds = Math.sin(v * Math.PI * 7.0) * 0.0022 * (0.35 + 0.65 * v);
    const rBase = rProximal + (rDistal - rProximal) * v + muscleBelly + clothFolds;

    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const ang = u * Math.PI * 2;
      const asym = 1.0 + 0.04 * Math.cos(ang * 2.0 + v * 3.0);
      pos.push(Math.sin(ang) * rBase * asym, y, Math.cos(ang) * rBase * asym);
      uvs.push(u, v);
    }
  }

  const row = segU + 1;
  for (let ir = 0; ir < rings; ir++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = ir * row + iu;
      const b = (ir + 1) * row + iu;
      const c = (ir + 1) * row + (iu + 1);
      const d = ir * row + (iu + 1);
      // ir -> +Y, iu -> +X from +Z (counter-clockwise? sin(ang), cos(ang): at u=0 (0,1), u=0.25 (1,0) -> clockwise around +Y, so (a, b, c) is outward!)
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
