import * as THREE from "../../vendor/three.module.js";

// Authentic 1945 USAAF AN-Standard B-29 Dual Instrument Panels (Captain Left + Copilot Right)
// - AN 5735-1 Directional Gyro: True 3D Rotating Horizontal Cylinder Drum behind Windowed Mask
// - AN 5736-1 Flight Gyro Horizon: Circular Aperture Mask preventing pitch card bleed
// - AN 5820 Turn & Bank: True 3D Rolling Black Agate Slip Ball inside Curved Glass Tube
// - 1940s USAAF Condensed Military Engraved Stencil Typography (ZERO modern monospace code fonts!)

const MIL_FONT = '"DIN Condensed", "Arial Narrow", "Trebuchet MS", Arial, sans-serif';

export function buildSharedInstrumentAtlas(spec) {
  const size = spec.atlasSize;
  const cell = size / 4;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#14181a";
  ctx.fillRect(0, 0, size, size);

  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = size;
  const glowCtx = glowCanvas.getContext("2d");
  glowCtx.fillStyle = "#000000";
  glowCtx.fillRect(0, 0, size, size);

  for (const dial of spec.atlasCells) {
    const [gx, gy] = dial.atlasGrid;
    const cx = (gx + 0.5) * cell;
    const cy = (gy + 0.5) * cell;
    drawDialCell(ctx, glowCtx, cx, cy, cell * 0.46, dial);
  }

  const faceTex = new THREE.CanvasTexture(canvas);
  faceTex.anisotropy = 8;
  faceTex.colorSpace = THREE.SRGBColorSpace;

  const glowTex = new THREE.CanvasTexture(glowCanvas);
  glowTex.anisotropy = 4;

  return { faceTex, glowTex };
}

function drawDialCell(ctx, glowCtx, cx, cy, R, dial) {
  ctx.save();
  glowCtx.save();

  const radGrad = ctx.createRadialGradient(cx, cy, R * 0.62, cx, cy, R * 0.96);
  radGrad.addColorStop(0.0, "#0b0d10");
  radGrad.addColorStop(0.78, "#080a0c");
  radGrad.addColorStop(1.0, "#030405");
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.96, 0, Math.PI * 2);
  ctx.fillStyle = radGrad;
  ctx.fill();

  ctx.strokeStyle = "#22282d";
  ctx.lineWidth = R * 0.035;
  ctx.stroke();

  const radium = "#d4ebb0";
  const glowCol = "#9be06c";

  const drawTick = (ang, r0, r1, w, isGlow = true) => {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    ctx.beginPath();
    ctx.moveTo(cx + c * r0, cy + s * r0);
    ctx.lineTo(cx + c * r1, cy + s * r1);
    ctx.strokeStyle = radium;
    ctx.lineWidth = w;
    ctx.stroke();

    if (isGlow) {
      glowCtx.beginPath();
      glowCtx.moveTo(cx + c * r0, cy + s * r0);
      glowCtx.lineTo(cx + c * r1, cy + s * r1);
      glowCtx.strokeStyle = glowCol;
      glowCtx.lineWidth = w * 1.25;
      glowCtx.stroke();
    }
  };

  const drawLabel = (txt, x, y, size, color = radium, glow = true) => {
    ctx.font = `700 ${Math.round(size)}px ${MIL_FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(txt, x, y);
    if (glow) {
      glowCtx.font = ctx.font;
      glowCtx.fillStyle = glowCol;
      glowCtx.textAlign = "center";
      glowCtx.textBaseline = "middle";
      glowCtx.fillText(txt, x, y);
    }
  };

  if (dial.type === "horizon") {
    const bankTicks = [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60];
    for (const deg of bankTicks) {
      const a = (deg - 90) * (Math.PI / 180);
      const len = deg % 30 === 0 ? 0.14 : 0.08;
      drawTick(a, R * (0.90 - len), R * 0.90, deg === 0 ? 5 : 3);
    }
    drawLabel("FLIGHT GYRO", cx, cy + R * 0.74, R * 0.11, "#9aa5ad", false);
  } else if (dial.type === "dg_drum") {
    // AN 5735-1 Directional Gyro faceplate around rectangular horizontal drum window!
    ctx.fillStyle = "#171b1f";
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.92, 0, Math.PI * 2);
    ctx.fill();

    // Recessed rectangular window frame
    ctx.strokeStyle = "#343b42";
    ctx.lineWidth = R * 0.045;
    ctx.strokeRect(cx - R * 0.62, cy - R * 0.25, R * 1.24, R * 0.50);
    ctx.fillStyle = "#080a0c";
    ctx.fillRect(cx - R * 0.60, cy - R * 0.23, R * 1.20, R * 0.46);

    drawLabel("DIRECTIONAL GYRO", cx, cy - R * 0.48, R * 0.11, "#a6b0b8", false);
    drawLabel("CAGE — PUSH", cx, cy + R * 0.56, R * 0.10, "#9aa5ad", false);
  } else if (dial.type === "turnbank") {
    drawTick(-Math.PI * 0.5, R * 0.68, R * 0.86, 5);
    drawTick(-Math.PI * 0.5 - 0.36, R * 0.70, R * 0.86, 4);
    drawTick(-Math.PI * 0.5 + 0.36, R * 0.70, R * 0.86, 4);
    drawLabel("L", cx - R * 0.46, cy - R * 0.34, R * 0.19);
    drawLabel("R", cx + R * 0.46, cy - R * 0.34, R * 0.19);

    // Curved glass inclinometer tube raceway + twin central radium lubber wires
    ctx.beginPath();
    ctx.arc(cx, cy - R * 0.36, R * 0.68, 0.33 * Math.PI, 0.67 * Math.PI);
    ctx.strokeStyle = "#4d594c";
    ctx.lineWidth = R * 0.18;
    ctx.stroke();

    // Center reference wires around ball
    for (const dx of [-R * 0.085, R * 0.085]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy + R * 0.22);
      ctx.lineTo(cx + dx, cy + R * 0.41);
      ctx.strokeStyle = radium;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    drawLabel("TURN & BANK", cx, cy + R * 0.64, R * 0.11, "#9aa5ad", false);
  } else if (dial.type === "rci") {
    // USAAF SCR-269 Radio Compass Indicator
    for (let deg = 0; deg < 360; deg += 15) {
      const a = (deg - 90) * (Math.PI / 180);
      const major = deg % 45 === 0;
      drawTick(a, R * (major ? 0.72 : 0.80), R * 0.89, major ? 3.8 : 2.0);
    }
    drawLabel("0", cx, cy - R * 0.56, R * 0.16);
    drawLabel("9", cx + R * 0.56, cy, R * 0.16);
    drawLabel("18", cx, cy + R * 0.56, R * 0.16);
    drawLabel("27", cx - R * 0.56, cy, R * 0.16);
    drawLabel("RADIO COMPASS", cx, cy + R * 0.24, R * 0.10, "#9aa5ad", false);
  } else if (dial.type === "clock") {
    for (let h = 1; h <= 12; h++) {
      const a = (h / 12) * Math.PI * 2 - Math.PI * 0.5;
      drawTick(a, R * 0.76, R * 0.88, h % 3 === 0 ? 4.5 : 2.5);
      drawLabel(String(h), cx + Math.cos(a) * R * 0.60, cy + Math.sin(a) * R * 0.60, R * 0.17);
    }
    drawLabel("ELGIN", cx, cy - R * 0.24, R * 0.10, "#8d98a0", false);
  } else if (dial.type === "altimeter") {
    for (let i = 0; i < 50; i++) {
      const a = (i / 50) * Math.PI * 2 - Math.PI * 0.5;
      const major = i % 5 === 0;
      drawTick(a, R * (major ? 0.73 : 0.81), R * 0.89, major ? 4 : 2);
      if (major) {
        drawLabel(String(i / 5), cx + Math.cos(a) * R * 0.57, cy + Math.sin(a) * R * 0.57, R * 0.19);
      }
    }
    drawLabel("ALT", cx, cy - R * 0.25, R * 0.13, "#9aa5ad", false);
    drawLabel("29.92", cx + R * 0.34, cy, R * 0.10, "#e6dfc8", false);
  } else {
    const startA = (-225 * Math.PI) / 180;
    const spanA = (270 * Math.PI) / 180;
    const minV = dial.minVal ?? 0;
    const maxV = dial.maxVal ?? 100;
    const step = dial.majorStep ?? 10;
    const minorCount = Math.round(((maxV - minV) / step) * 5);

    for (let i = 0; i <= minorCount; i++) {
      const u = i / minorCount;
      const a = startA + u * spanA;
      const major = i % 5 === 0;
      drawTick(a, R * (major ? 0.73 : 0.81), R * 0.89, major ? 4 : 2);
      if (major) {
        const v = minV + u * (maxV - minV);
        drawLabel(String(Math.round(v)), cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.55, R * 0.16);
      }
    }
    drawLabel(dial.title, cx, cy + R * 0.30, R * 0.11, "#9aa5ad", false);
    if (dial.unit) {
      drawLabel(dial.unit, cx, cy + R * 0.45, R * 0.09, "#7d8790", false);
    }
  }

  ctx.restore();
  glowCtx.restore();
}

// Create horizontal wrap-around degree tape texture for AN 5735-1 Rotating Drum Directional Gyro!
function createDirectionalGyroDrumTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#111417";
  ctx.fillRect(0, 0, 1024, 128);

  const radium = "#d8efb4";
  ctx.strokeStyle = radium;
  ctx.fillStyle = radium;
  ctx.font = `700 44px ${MIL_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let deg = 0; deg < 360; deg += 5) {
    const x = (deg / 360) * 1024;
    const is10 = deg % 10 === 0;
    const is30 = deg % 30 === 0;
    ctx.lineWidth = is30 ? 3.5 : 2.0;
    ctx.beginPath();
    ctx.moveTo(x, 8);
    ctx.lineTo(x, is10 ? 34 : 22);
    ctx.moveTo(x, 120);
    ctx.lineTo(x, is10 ? 94 : 106);
    ctx.stroke();

    if (is30) {
      const lbl =
        deg === 0 ? "N" : deg === 90 ? "E" : deg === 180 ? "S" : deg === 270 ? "W" : String(deg / 10);
      ctx.fillText(lbl, x, 66);
      if (deg === 0) ctx.fillText("N", 1024, 66);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildDialMeshInstance(dialPlacement, cellDef, atlas, materials) {
  const R = dialPlacement.radius;
  const dGroup = new THREE.Group();
  const { bezelMat, needleMat, needle2Mat, apertureMaskMat, slipBallMat, glassMat, dgDrumMat } = materials;

  // Stepped 3D AN-Standard Cast Bezel + Recessed Inner Barrel + 4 Corner Mounting Screws!
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(R, R * 0.088, 14, 36), bezelMat);
  const innerRing = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.95, R * 0.95, 0.010, 32, 1, true), apertureMaskMat);
  innerRing.rotation.x = Math.PI * 0.5;
  innerRing.position.z = 0.002;
  dGroup.add(bezel, innerRing);

  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.045, R * 0.045, 0.005, 10), bezelMat);
    screw.rotation.x = Math.PI * 0.5;
    screw.position.set(sx * R * 0.78, sy * R * 0.78, 0.002);
    dGroup.add(screw);
  }

  const [gx, gy] = cellDef.atlasGrid;
  const faceGeom = new THREE.CircleGeometry(R * 0.96, 34);
  const uvAttr = faceGeom.attributes.uv;
  for (let i = 0; i < uvAttr.count; i++) {
    const u = (gx + uvAttr.getX(i)) * 0.25;
    const v = 1.0 - (gy + 1.0 - uvAttr.getY(i)) * 0.25;
    uvAttr.setXY(i, u, v);
  }
  const faceMat = new THREE.MeshStandardMaterial({
    map: atlas.faceTex,
    emissiveMap: atlas.glowTex,
    emissive: new THREE.Color(0x90d468),
    emissiveIntensity: 0.58,
    roughness: 0.92,
    metalness: 0.04,
    envMapIntensity: 0.08,
  });
  const faceMesh = new THREE.Mesh(faceGeom, faceMat);
  faceMesh.position.z = -0.003;
  dGroup.add(faceMesh);

  const makeNeedle = (lenScale, widScale, mat, zOff = 0.0035) => {
    const pivot = new THREE.Group();
    pivot.position.z = zOff;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(R * widScale, R * lenScale, 0.0015), mat);
    bar.position.y = R * lenScale * 0.36;
    pivot.add(bar);
    dGroup.add(pivot);
    return pivot;
  };

  let rig = null;

  if (cellDef.type === "horizon") {
    // Authentic WWII USAAF Sperry AN 5736-1 All-Matte-Black Artificial Horizon (ZERO modern blue sky!)
    const cardGroup = new THREE.Group();
    cardGroup.position.z = 0.0006;
    const skyHalf = new THREE.Mesh(
      new THREE.CircleGeometry(R * 0.66, 28, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x12161a, roughness: 0.92, envMapIntensity: 0.06 })
    );
    const gndHalf = new THREE.Mesh(
      new THREE.CircleGeometry(R * 0.66, 28, Math.PI, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x090b0d, roughness: 0.95, envMapIntensity: 0.05 })
    );
    const hLine = new THREE.Mesh(new THREE.BoxGeometry(R * 1.28, 0.0032, 0.0012), needleMat);
    const bankPtr = new THREE.Mesh(new THREE.ConeGeometry(R * 0.055, R * 0.11, 3), needleMat);
    bankPtr.position.set(0, R * 0.56, 0.0015);
    cardGroup.add(skyHalf, gndHalf, hLine, bankPtr);
    dGroup.add(cardGroup);

    // Circular Viewport Mask Ring preventing horizon disc from bleeding outside aperture when pitching!
    const maskRing = new THREE.Mesh(new THREE.RingGeometry(R * 0.62, R * 0.95, 36), apertureMaskMat);
    maskRing.position.z = 0.0028;
    dGroup.add(maskRing);

    // Gull-wing miniature B-29 reference index + center dot + caging knob
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(R * 0.34, 0.0032, 0.002), needle2Mat);
    wingL.position.set(-R * 0.25, 0, 0.0046);
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(R * 0.34, 0.0032, 0.002), needle2Mat);
    wingR.position.set(R * 0.25, 0, 0.0046);
    const gullDot = new THREE.Mesh(new THREE.CircleGeometry(R * 0.038, 14), needle2Mat);
    gullDot.position.z = 0.0048;
    const cageKnob = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.095, R * 0.095, 0.012, 14), bezelMat);
    cageKnob.rotation.x = Math.PI * 0.5;
    cageKnob.position.set(R * 0.62, -R * 0.58, 0.007);
    dGroup.add(wingL, wingR, gullDot, cageKnob);

    rig = { type: "horizon", cardGroup, radius: R };
  } else if (cellDef.type === "dg_drum") {
    // True 3D AN 5735-1 Rotating Horizontal Drum Card behind Slotted Faceplate!
    const drumRadius = R * 0.56;
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(drumRadius, drumRadius, R * 0.40, 36, 1, true),
      dgDrumMat
    );
    // Position cylinder drum so its front arc pokes cleanly into the rectangular window slot!
    drum.position.set(0, 0, -drumRadius + 0.0022);
    dGroup.add(drum);

    // Upper & lower mask plates framing only the rectangular drum window
    const topMask = new THREE.Mesh(new THREE.PlaneGeometry(R * 1.32, R * 0.52), apertureMaskMat);
    topMask.position.set(0, R * 0.49, 0.0026);
    const botMask = new THREE.Mesh(new THREE.PlaneGeometry(R * 1.32, R * 0.52), apertureMaskMat);
    botMask.position.set(0, -R * 0.49, 0.0026);
    const leftMask = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.34, R * 0.52), apertureMaskMat);
    leftMask.position.set(-R * 0.74, 0, 0.0026);
    const rightMask = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.34, R * 0.52), apertureMaskMat);
    rightMask.position.set(R * 0.74, 0, 0.0026);

    // Fixed radium vertical lubber line + caging knob below
    const lubber = new THREE.Mesh(new THREE.BoxGeometry(0.0022, R * 0.44, 0.002), needle2Mat);
    lubber.position.set(0, 0, 0.0042);
    const cageKnob = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.11, R * 0.11, 0.014, 14), bezelMat);
    cageKnob.rotation.x = Math.PI * 0.5;
    cageKnob.position.set(0, -R * 0.58, 0.008);

    dGroup.add(topMask, botMask, leftMask, rightMask, lubber, cageKnob);
    rig = { type: "dg_drum", drum };
  } else if (cellDef.type === "turnbank") {
    const n1 = makeNeedle(0.72, 0.052, needleMat, 0.0038);
    // Physical 3D Black Agate Slip Ball rolling along curved inclinometer arc!
    const slipBall = new THREE.Mesh(new THREE.SphereGeometry(R * 0.072, 12, 10), slipBallMat);
    slipBall.position.set(0, -R * 0.32, 0.0032);
    dGroup.add(slipBall);
    rig = { type: "turnbank", n1, slipBall, radius: R };
  } else if (cellDef.type === "altimeter") {
    const n100 = makeNeedle(0.82, 0.045, needleMat, 0.0045);
    const n1k = makeNeedle(0.56, 0.075, needleMat, 0.0032);
    const n10k = makeNeedle(0.74, 0.028, needle2Mat, 0.0022);
    rig = { type: "altimeter", n100, n1k, n10k };
  } else if (cellDef.type === "clock") {
    const nHr = makeNeedle(0.50, 0.065, needleMat, 0.0025);
    const nMin = makeNeedle(0.74, 0.045, needleMat, 0.0035);
    const nSec = makeNeedle(0.80, 0.024, needle2Mat, 0.0045);
    rig = { type: "clock", nHr, nMin, nSec };
  } else {
    const n1 = makeNeedle(0.78, 0.048, needleMat, 0.0035);
    rig = { type: cellDef.type, n1, cellDef };
  }

  if (cellDef.type !== "dg_drum" && cellDef.type !== "horizon") {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.09, R * 0.09, 0.004, 14), bezelMat);
    cap.rotation.x = Math.PI * 0.5;
    cap.position.z = 0.0045;
    dGroup.add(cap);
  }

  const lens = new THREE.Mesh(new THREE.CircleGeometry(R * 0.95, 28), glassMat);
  lens.position.z = 0.007;
  dGroup.add(lens);

  return { dGroup, rig };
}

export function createCaptainInstruments(spec, panelZ) {
  const atlas = buildSharedInstrumentAtlas(spec);
  const cellMap = new Map(spec.atlasCells.map((c) => [c.id, c]));

  const materials = {
    bezelMat: new THREE.MeshStandardMaterial({ color: 0x1a1e21, roughness: 0.42, metalness: 0.78 }),
    needleMat: new THREE.MeshStandardMaterial({
      color: 0xe4f2c2,
      emissive: 0x7ab856,
      emissiveIntensity: 0.55,
      roughness: 0.35,
    }),
    needle2Mat: new THREE.MeshStandardMaterial({
      color: 0xf2b968,
      emissive: 0x9c6b24,
      emissiveIntensity: 0.48,
      roughness: 0.35,
    }),
    apertureMaskMat: new THREE.MeshStandardMaterial({
      color: 0x0c0f12,
      roughness: 0.90,
      metalness: 0.12,
      envMapIntensity: 0.08,
    }),
    slipBallMat: new THREE.MeshStandardMaterial({ color: 0x0b0d0f, roughness: 0.18, metalness: 0.35 }),
    dgDrumMat: new THREE.MeshStandardMaterial({
      map: createDirectionalGyroDrumTexture(),
      emissive: 0x5c8f42,
      emissiveIntensity: 0.34,
      roughness: 0.85,
      envMapIntensity: 0.08,
    }),
    glassMat: new THREE.MeshPhysicalMaterial({
      color: 0xddeeff,
      transparent: true,
      opacity: 0.07,
      roughness: 0.10,
      metalness: 0.05,
      envMapIntensity: 0.45,
      depthWrite: false,
    }),
  };

  const group = new THREE.Group();
  const liveList = [];

  // Populate BOTH Captain (Left) AND Copilot (Right) Flight Instrument Panels!
  for (const placement of [...spec.captainDials, ...spec.copilotDials]) {
    const cellDef = cellMap.get(placement.cellId);
    const { dGroup, rig } = buildDialMeshInstance(placement, cellDef, atlas, materials);
    dGroup.position.set(placement.panelPos[0], placement.panelPos[1], panelZ + 0.008);
    group.add(dGroup);
    liveList.push(rig);
  }

  // Knurled-Bezel Faceted Glass Bomb-Bay / Release Jewel Indicator Lamps on Center C-1 Bridge!
  const bayAmberMat = new THREE.MeshBasicMaterial({ color: 0x362810 });
  const relRedMat = new THREE.MeshBasicMaterial({ color: 0x361010 });
  for (const [lx, lMat] of [[-0.042, bayAmberMat], [0.042, relRedMat]]) {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.008, 16), materials.bezelMat);
    collar.rotation.x = Math.PI * 0.5;
    collar.position.set(lx, 0.005, panelZ + 0.008);
    const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.0095, 1), lMat);
    jewel.position.set(lx, 0.005, panelZ + 0.013);
    group.add(collar, jewel);
  }

  const arcAngle = (val, minV, maxV) => {
    const u = Math.max(0, Math.min(1, (val - minV) / (maxV - minV)));
    return (135 - u * 270) * (Math.PI / 180);
  };

  return {
    group,
    atlas,
    materials,
    cellMap,
    update(flightState, baseHms) {
      const flutter = flightState.shock.cockpitShake[0] * 1.8;
      const totalSec = baseHms[0] * 3600 + baseHms[1] * 60 + baseHms[2] + flightState.time;

      // Update bomb-bay open amber jewel & bomb-gone red jewel
      bayAmberMat.color.setHex(flightState.bombBayOpenRatio > 0.1 ? 0xffae2b : 0x2b2210);
      relRedMat.color.setHex(flightState.bomb.released ? 0xff3322 : 0x2b1010);

      for (const rig of liveList) {
        if (rig.type === "horizon") {
          rig.cardGroup.rotation.z = (flightState.rollDeg * Math.PI) / 180;
          rig.cardGroup.position.y =
            Math.max(-0.28, Math.min(0.28, -flightState.pitchDeg * 0.012)) * rig.radius;
        } else if (rig.type === "dg_drum") {
          // Rotate horizontal drum around vertical Y axis to display exact magnetic/true heading!
          rig.drum.rotation.y = -((flightState.headingDeg - 90.0) * Math.PI) / 180;
        } else if (rig.type === "turnbank") {
          const rateNorm = Math.max(-1.3, Math.min(1.3, flightState.turnRateDps / 3.0));
          rig.n1.rotation.z = -rateNorm * 0.36 + flutter * 0.4;
          // Roll 3D black agate Slip Ball along curved inclinometer arc!
          const ballAng = Math.PI * 0.5 + flightState.slipBallNorm * 0.36;
          const arcR = rig.radius * 0.68;
          rig.slipBall.position.set(
            Math.cos(ballAng) * arcR,
            -rig.radius * 0.36 + Math.sin(ballAng) * arcR,
            0.0038
          );
        } else if (rig.type === "altimeter") {
          const ft = flightState.altitudeFt;
          rig.n100.rotation.z = -((ft % 1000) / 1000) * Math.PI * 2 + flutter * 0.3;
          rig.n1k.rotation.z = -((ft % 10000) / 10000) * Math.PI * 2;
          rig.n10k.rotation.z = -((ft % 100000) / 100000) * Math.PI * 2;
        } else if (rig.type === "clock") {
          rig.nSec.rotation.z = -((totalSec % 60) / 60) * Math.PI * 2;
          rig.nMin.rotation.z = -(((totalSec / 60) % 60) / 60) * Math.PI * 2;
          rig.nHr.rotation.z = -(((totalSec / 3600) % 12) / 12) * Math.PI * 2;
        } else if (rig.type === "rci") {
          // Point radio compass needle toward Hiroshima beacon [0, 0]
          const brgToHypo = (Math.atan2(-flightState.position[0], flightState.position[2]) * 180) / Math.PI;
          const relBrg = ((brgToHypo - flightState.headingDeg) * Math.PI) / 180;
          rig.n1.rotation.z = -relBrg + flutter * 0.25;
        } else if (rig.type === "vsi") {
          rig.n1.rotation.z = arcAngle(flightState.vsiFpm / 1000.0, -4, 4) + flutter * 0.5;
        } else if (rig.cellDef) {
          const id = rig.cellDef.id;
          let val = 0;
          if (id === "asi") val = flightState.iasMph;
          else if (id === "gmeter") val = flightState.gLoad;
          else if (id === "cabinalt") val = 8.2; // Pressurized B-29 cabin held at 8,200 ft!
          else if (id === "oxy") val = 3.8;
          else if (id === "suction") val = 4.9;
          rig.n1.rotation.z = arcAngle(val, rig.cellDef.minVal, rig.cellDef.maxVal) + flutter * 0.2;
        }
      }
    },
  };
}
