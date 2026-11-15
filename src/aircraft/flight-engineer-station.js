import * as THREE from "../../vendor/three.module.js";
import { buildDialMeshInstance } from "./instruments-canvas.js";
import { createRelaxedHandAssembly } from "./hand-sculptor.js";
import {
  createAviatorMaterials,
  buildSculptedAviatorHead,
  buildSculptedAviatorTorso,
  buildWrinkledSleeveGeometry,
} from "./crew-sculptor.js";

// Aft-Facing B-29 Flight Engineer Station (2nd Lt. Wyatt Duzenbury),
// 4-Engine 16-Dial R-3350 Monitoring Board, Beveled Overhead Electrical Switch Console,
// Flush Hood Defroster Louvers & Framed Articulated Tinted Plexiglas Sun Visors.

export function createFlightEngineerAndOverhead(airframeSpec, instSpec, sharedInstBundle) {
  const group = new THREE.Group();
  const ck = airframeSpec.cockpit;
  const { atlas, materials, cellMap } = sharedInstBundle;

  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x191d20,
    roughness: 0.78,
    metalness: 0.25,
    envMapIntensity: 0.2,
  });
  const bronzeGreenMat = new THREE.MeshStandardMaterial({
    color: 0x2c3628,
    roughness: 0.52,
    metalness: 0.56,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x181c20, roughness: 0.48, metalness: 0.68 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcdd5dd, roughness: 0.24, metalness: 0.88 });
  const redGuardMat = new THREE.MeshStandardMaterial({ color: 0xb02c22, roughness: 0.42, metalness: 0.25 });

  // 1. BEVELED OVERHEAD ELECTRICAL SWITCH CONSOLE & SCISSOR-MOUNTED TINTED PLEXIGLAS SUN VISORS
  const overheadRoot = new THREE.Group();
  overheadRoot.position.set(0, 1.28, -2.98);

  const ohProfile = new THREE.Shape();
  ohProfile.moveTo(-0.22, 0.04);
  ohProfile.lineTo(0.22, 0.04);
  ohProfile.lineTo(0.19, -0.04);
  ohProfile.lineTo(-0.19, -0.04);
  ohProfile.closePath();
  const switchBoardGeom = new THREE.ExtrudeGeometry(ohProfile, {
    depth: 1.38,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  const switchBoard = new THREE.Mesh(switchBoardGeom, panelMat);
  switchBoard.position.z = -0.69;
  overheadRoot.add(switchBoard);

  // 32 Bat-Handle Chrome Toggle Switches with Hex Locknuts + 4 Hinged Red Master Guard Covers
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 4; col++) {
      const sx = -0.126 + col * 0.084;
      const sz = -0.54 + row * 0.155;
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.006, 6), chromeMat);
      nut.position.set(sx, -0.044, sz);
      const bat = new THREE.Mesh(new THREE.ConeGeometry(0.0042, 0.024, 8), chromeMat);
      bat.position.set(sx, -0.056, sz);
      bat.rotation.x = Math.PI + (row % 2 === 0 ? 0.32 : -0.26);
      overheadRoot.add(nut, bat);
    }
  }
  for (let g = 0; g < 4; g++) {
    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.0032, 6, 12, Math.PI), redGuardMat);
    guard.rotation.y = Math.PI * 0.5;
    guard.rotation.z = Math.PI;
    guard.position.set(-0.126 + g * 0.084, -0.044, -0.62);
    overheadRoot.add(guard);
  }
  group.add(overheadRoot);

  // Framed Tinted Green Plexiglas Sun Visors on Articulated Chrome Arms (Port & Starboard)
  const visorMat = new THREE.MeshPhysicalMaterial({
    color: 0x235830,
    transparent: true,
    opacity: 0.38,
    roughness: 0.12,
    side: THREE.DoubleSide,
  });
  for (const sx of [-0.48, 0.48]) {
    const vGroup = new THREE.Group();
    vGroup.position.set(sx, 0.92, -3.72);
    vGroup.rotation.x = 0.52;

    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.115), visorMat);
    const topClamp = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.37, 10), chromeMat);
    topClamp.rotation.z = Math.PI * 0.5;
    topClamp.position.y = 0.058;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.12, 8), chromeMat);
    arm.position.set(-Math.sign(sx) * 0.14, 0.11, -0.02);
    arm.rotation.z = Math.sign(sx) * 0.35;

    vGroup.add(pane, topClamp, arm);
    group.add(vGroup);
  }

  // Flush Recessed Warm-Air Windshield Defroster Louvers set forward inside the anti-glare hood (ZERO boxy protrusions above brow!)
  for (const sx of [-0.62, -0.36, 0.36, 0.62]) {
    const louverSlot = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.13, 10), darkMetalMat);
    louverSlot.rotation.z = Math.PI * 0.5;
    louverSlot.position.set(sx, 0.142, ck.panelZ - 0.14);
    group.add(louverSlot);
  }

  // 2. AFT-FACING FLIGHT ENGINEER STATION (2nd Lt. Wyatt Duzenbury at Bulkhead Station 148)
  const engBoardZ = ck.engineerPanelZ; // -1.62m
  const engCabShape = new THREE.Shape();
  engCabShape.moveTo(-0.34, -0.36);
  engCabShape.lineTo(0.34, -0.36);
  engCabShape.lineTo(0.34, 0.32);
  engCabShape.quadraticCurveTo(0.34, 0.37, 0.28, 0.37);
  engCabShape.lineTo(-0.28, 0.37);
  engCabShape.quadraticCurveTo(-0.34, 0.37, -0.34, 0.32);
  engCabShape.closePath();

  const engCabinet = new THREE.Mesh(
    new THREE.ExtrudeGeometry(engCabShape, {
      depth: 0.11,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
    }),
    panelMat
  );
  engCabinet.position.set(0.72, 0.04, engBoardZ + 0.005);
  group.add(engCabinet);

  // Contoured Engineer Control Desk + Mixture / Turbo / Cowl-Flap Levers
  const engDesk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.66, 18, 1, false, 0, Math.PI), bronzeGreenMat);
  engDesk.rotation.z = Math.PI * 0.5;
  engDesk.position.set(0.72, -0.25, engBoardZ - 0.10);
  group.add(engDesk);

  for (let i = 0; i < 8; i++) {
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.105, 0.010), chromeMat);
    lever.position.set(0.47 + i * 0.068, -0.14, engBoardZ - 0.13);
    lever.rotation.x = -0.32;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 10, 8), i < 4 ? redGuardMat : darkMetalMat);
    knob.position.y = 0.052;
    lever.add(knob);
    group.add(lever);
  }

  // 16 Live R-3350 Engine Dials facing -Z
  const engLiveRigs = [];
  const eg = instSpec.engineerGrid;
  for (let r = 0; r < eg.rows.length; r++) {
    const cellDef = cellMap.get(eg.rows[r]);
    for (let e = 0; e < eg.engineCount; e++) {
      const px = 0.47 + e * 0.165;
      const py = 0.28 - r * 0.125;
      const { dGroup, rig } = buildDialMeshInstance({ radius: eg.dialRadius }, cellDef, atlas, materials);
      dGroup.position.set(px, py, engBoardZ - 0.004);
      dGroup.rotation.y = Math.PI;
      group.add(dGroup);
      engLiveRigs.push({ rig, rowId: eg.rows[r], engIdx: e });
    }
  }

  // Contoured Swivel Bucket Seat & Sculpted Flight Engineer Figure (with 5-Finger Catmull-Clark Hands!)
  const feGroup = new THREE.Group();
  feGroup.position.set(ck.engineerSeat[0], ck.engineerSeat[1], ck.engineerSeat[2]);

  const feSeatShell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.21, 0.54, 18, 1, true, -Math.PI * 0.42, Math.PI * 0.84),
    bronzeGreenMat
  );
  feSeatShell.position.set(0, 0.06, 0);
  feGroup.add(feSeatShell);

  const avMats = createAviatorMaterials();
  const feBody = new THREE.Group();
  feBody.position.set(0, 0.22, 0);
  const feTorso = buildSculptedAviatorTorso(avMats);
  feTorso.rotation.y = Math.PI;
  const feHead = buildSculptedAviatorHead(avMats, {
    gogglesDown: false,
    wearOxygenMask: false,
  });
  feHead.position.set(0, 0.33, 0.0);
  feTorso.add(feHead);

  const feSleeveGeom = buildWrinkledSleeveGeometry(0.046, 0.033, 0.30);
  for (const ax of [-1, 1]) {
    const arm = new THREE.Mesh(feSleeveGeom, avMats.jacketMat);
    arm.position.set(ax * 0.18, 0.02, 0.15);
    arm.rotation.x = Math.PI * 0.36;
    const hand = createRelaxedHandAssembly(ax);
    hand.position.set(ax * 0.16, -0.05, 0.28);
    hand.rotation.set(-0.4, Math.PI, 0);
    feBody.add(arm, hand);
  }
  feBody.add(feTorso);
  feGroup.add(feBody);
  group.add(feGroup);

  const arcAngle = (val, minV, maxV) => {
    const u = Math.max(0, Math.min(1, (val - minV) / (maxV - minV)));
    return (135 - u * 270) * (Math.PI / 180);
  };

  return {
    group,
    update(flightState) {
      const rpmHund = flightState.rpm / 100.0;
      const mapInHg = flightState.manifoldInHg;
      const chtHund = 1.95 + flightState.throttle * 0.42;
      const oilPsi = 78.0 + flightState.throttle * 14.0;

      for (const item of engLiveRigs) {
        const phaseJit = 0.22 * Math.sin(flightState.time * 1.4 + item.engIdx * 1.7);
        let val = 0;
        if (item.rowId === "eng_rpm") val = rpmHund + phaseJit;
        else if (item.rowId === "eng_map") val = mapInHg + phaseJit * 0.8;
        else if (item.rowId === "eng_cht") val = chtHund + item.engIdx * 0.03;
        else if (item.rowId === "eng_oil") val = oilPsi + item.engIdx * 1.2;

        item.rig.n1.rotation.z = arcAngle(val, item.rig.cellDef.minVal, item.rig.cellDef.maxVal);
      }

      feBody.position.y = 0.22 + Math.sin(flightState.time * 1.6) * 0.003 + flightState.shock.cockpitShake[1] * 0.4;
      feHead.rotation.y = 0.18 * Math.sin(flightState.time * 0.55);
    },
  };
}
