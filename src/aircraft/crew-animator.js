import * as THREE from "../../vendor/three.module.js";
import { createIKArmRig } from "./ik-solver.js";
import { buildAuthenticBoeingYoke } from "./boeing-yoke.js";
import { createGrippingHandAssembly, createRelaxedHandAssembly } from "./hand-sculptor.js";
import {
  createAviatorMaterials,
  buildSculptedAviatorHead,
  buildSculptedAviatorTorso,
  buildWrinkledSleeveGeometry,
} from "./crew-sculptor.js";

// Authentic Boeing B-29 Offset Control Columns, Bakelite Yokes, Parented Catmull-Clark Human Hands,
// Cast-Aluminum Rudder Pedals, and Sculpted Anatomical USAAF Multi-Crew Figures!

function buildContouredPedalGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.048, -0.075);
  shape.lineTo(0.048, -0.075);
  shape.quadraticCurveTo(0.056, 0.0, 0.044, 0.078);
  shape.quadraticCurveTo(0.0, 0.092, -0.044, 0.078);
  shape.quadraticCurveTo(-0.056, 0.0, -0.048, -0.075);
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 3,
  });
}

function buildSeatedLegsAndPedals(seatX, floorY, pedalZ, suitMat, bootMat, shearlingMat, metalMat) {
  const rig = new THREE.Group();
  const pedalGeom = buildContouredPedalGeometry();

  const leftPedal = new THREE.Mesh(pedalGeom, metalMat);
  leftPedal.position.set(seatX - 0.13, floorY + 0.11, pedalZ);
  leftPedal.rotation.x = -0.38;
  const rightPedal = new THREE.Mesh(pedalGeom, metalMat);
  rightPedal.position.set(seatX + 0.13, floorY + 0.11, pedalZ);
  rightPedal.rotation.x = -0.38;
  rig.add(leftPedal, rightPedal);

  const thighGeom = buildWrinkledSleeveGeometry(0.074, 0.058, 0.38);
  const calfGeom = buildWrinkledSleeveGeometry(0.058, 0.048, 0.36);

  const legs = [];
  for (const ls of [-1, 1]) {
    const lx = seatX + ls * 0.125;
    const thigh = new THREE.Mesh(thighGeom, suitMat);
    thigh.position.set(lx, floorY + 0.44, pedalZ + 0.48);
    thigh.rotation.x = Math.PI * 0.44;

    const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 10), suitMat);
    kneeCap.position.set(lx, floorY + 0.40, pedalZ + 0.31);

    const calf = new THREE.Mesh(calfGeom, suitMat);
    calf.position.set(lx, floorY + 0.25, pedalZ + 0.22);
    calf.rotation.x = Math.PI * 0.22;

    // USAAF A-6 Winter Flying Boots
    const bootShaft = new THREE.Mesh(buildWrinkledSleeveGeometry(0.055, 0.050, 0.15), bootMat);
    bootShaft.position.set(lx, floorY + 0.17, pedalZ + 0.12);
    bootShaft.rotation.x = 0.25;
    const bootFleece = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.012, 8, 18), shearlingMat);
    bootFleece.rotation.x = Math.PI * 0.5;
    bootFleece.position.y = 0.072;
    bootShaft.add(bootFleece);

    const bootFoot = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), bootMat);
    bootFoot.scale.set(0.88, 0.68, 1.85);
    bootFoot.position.set(lx, floorY + 0.10, pedalZ + 0.05);
    bootFoot.rotation.x = -0.22;

    rig.add(thigh, kneeCap, calf, bootShaft, bootFoot);
    legs.push({ side: ls, pedal: ls < 0 ? leftPedal : rightPedal, bootFoot, bootShaft, calf });
  }

  return {
    rig,
    update(rudderNorm) {
      for (const l of legs) {
        const dz = l.side * rudderNorm * 0.045;
        l.pedal.position.z = pedalZ + dz;
        l.bootFoot.position.z = pedalZ + 0.05 + dz;
        l.bootShaft.position.z = pedalZ + 0.12 + dz * 0.75;
        l.calf.position.z = pedalZ + 0.22 + dz * 0.5;
      }
    },
  };
}

export function createCrewAndControls(spec, mission) {
  const group = new THREE.Group();
  const ck = spec.cockpit;
  const detonationTime = mission.detonationTime;
  const releaseTime = mission.releaseTime;

  const avMats = createAviatorMaterials();
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1f2428, roughness: 0.48, metalness: 0.72 });

  // 1. Authentic Smithsonian "Enola Gay" Offset Control Columns & Molded Bakelite Butterfly Wheels
  const leftYoke = buildAuthenticBoeingYoke(-1);
  leftYoke.pitchPivot.position.set(ck.yokePivotLeft[0], -0.66, ck.yokePivotLeft[2]);
  group.add(leftYoke.pitchPivot);

  const rightYoke = buildAuthenticBoeingYoke(+1);
  rightYoke.pitchPivot.position.set(ck.yokePivotRight[0], -0.66, ck.yokePivotRight[2]);
  group.add(rightYoke.pitchPivot);

  // Parent Catmull-Clark Subdivided Anatomical Human Hands DIRECTLY onto the Bakelite Yoke Grip Anchors!
  // Zero slip, zero rotation lag — fingers stay 100% locked inside the Bakelite finger grooves at every bank angle!
  const capLeftHand = createGrippingHandAssembly(-1, true); // Captain's left wrist wears 1944 USAAF A-11 Ordnance Watch!
  const capRightHand = createGrippingHandAssembly(+1, false);
  leftYoke.leftGripAnchor.add(capLeftHand.root);
  leftYoke.rightGripAnchor.add(capRightHand.root);

  const cpRightHand = createGrippingHandAssembly(+1, false);
  rightYoke.rightGripAnchor.add(cpRightHand.root);

  const cpLeftFreeHand = createRelaxedHandAssembly(-1);

  // 2. CAPTAIN COL. PAUL TIBBETS (Left Seat)
  const capLegs = buildSeatedLegsAndPedals(
    ck.captainSeat[0],
    -0.68,
    -3.76,
    avMats.jacketMat,
    avMats.gloveLeatherMat,
    avMats.shearlingMat,
    darkMetalMat
  );
  group.add(capLegs.rig);

  const captainGroup = new THREE.Group();
  captainGroup.position.set(ck.captainSeat[0], ck.captainSeat[1], ck.captainSeat[2]);
  const capTorso = buildSculptedAviatorTorso(avMats);
  capTorso.position.set(0, 0.24, 0.04);

  const capHead = buildSculptedAviatorHead(avMats, {
    gogglesDown: false,
    wearOxygenMask: false,
  });
  capHead.position.set(0, 0.34, -0.01);
  capTorso.add(capHead);
  captainGroup.add(capTorso);
  group.add(captainGroup);

  const { upperArmLen, forearmLen } = ck.ikArm;
  const capLeftArmIK = createIKArmRig(-1, upperArmLen, forearmLen, avMats.jacketMat, null);
  const capRightArmIK = createIKArmRig(+1, upperArmLen, forearmLen, avMats.jacketMat, null);
  group.add(capLeftArmIK.root, capRightArmIK.root);

  // 3. COPILOT CAPT. ROBERT LEWIS (Right Seat)
  const cpLegs = buildSeatedLegsAndPedals(
    ck.copilotSeat[0],
    -0.68,
    -3.76,
    avMats.jacketMat,
    avMats.gloveLeatherMat,
    avMats.shearlingMat,
    darkMetalMat
  );
  group.add(cpLegs.rig);

  const copilotGroup = new THREE.Group();
  copilotGroup.position.set(ck.copilotSeat[0], ck.copilotSeat[1], ck.copilotSeat[2]);
  const cpTorso = buildSculptedAviatorTorso(avMats);
  cpTorso.position.set(0, 0.24, 0.04);

  const cpHead = buildSculptedAviatorHead(avMats, {
    gogglesDown: false,
    wearOxygenMask: true,
    hoseEndLocal: new THREE.Vector3(0.46, -0.38, -0.03),
  });
  cpHead.position.set(0, 0.34, -0.01);
  cpTorso.add(cpHead);
  copilotGroup.add(cpTorso);
  group.add(copilotGroup);

  const cpLeftArmIK = createIKArmRig(-1, upperArmLen, forearmLen, avMats.jacketMat, cpLeftFreeHand);
  const cpRightArmIK = createIKArmRig(+1, upperArmLen, forearmLen, avMats.jacketMat, null);
  group.add(cpLeftArmIK.root, cpRightArmIK.root);

  // 4. BOMBARDIER MAJ. THOMAS FEREBEE (Forward Glazed Nose behind Norden M-9 Bombsight!)
  const bombardierGroup = new THREE.Group();
  bombardierGroup.position.set(ck.bombardierSeat[0], ck.bombardierSeat[1] - 0.12, ck.bombardierSeat[2] - 0.06);
  const bomSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.05, 18), darkMetalMat);
  bomSeat.position.set(0, -0.08, 0.06);

  const bomTorso = buildSculptedAviatorTorso(avMats);
  bomTorso.position.set(0, 0.14, -0.04);
  bomTorso.rotation.x = -0.38;

  const bomHead = buildSculptedAviatorHead(avMats, {
    gogglesDown: false,
    wearOxygenMask: false,
  });
  bomHead.position.set(0, 0.33, -0.02);
  bomHead.rotation.x = -0.14;
  bomTorso.add(bomHead);

  const bomSleeveGeom = buildWrinkledSleeveGeometry(0.046, 0.033, 0.30);
  for (const bx of [-1, 1]) {
    const bArm = new THREE.Mesh(bomSleeveGeom, avMats.jacketMat);
    bArm.position.set(bx * 0.16, 0.16, -0.22);
    bArm.rotation.x = Math.PI * 0.36;
    bArm.rotation.z = -bx * 0.42;

    const bHand = createRelaxedHandAssembly(bx);
    bHand.position.set(bx * 0.10, 0.08, -0.35);
    bHand.rotation.set(0.35, bx * 0.25, 0);
    bombardierGroup.add(bArm, bHand);
  }
  bombardierGroup.add(bomSeat, bomTorso);
  group.add(bombardierGroup);

  // 5. TAIL GUNNER SGT. BOB CARON (Aft Tail Turret facing AFT +Z with protective flash goggles!)
  const tailGunnerGroup = new THREE.Group();
  tailGunnerGroup.position.set(ck.tailGunnerSeat[0], ck.tailGunnerSeat[1], ck.tailGunnerSeat[2]);
  const tgTorso = buildSculptedAviatorTorso(avMats);
  tgTorso.rotation.y = Math.PI;
  tgTorso.position.set(0, 0.20, 0.0);

  const tgHead = buildSculptedAviatorHead(avMats, {
    gogglesDown: true,
    wearOxygenMask: true,
  });
  tgHead.position.set(0, 0.33, 0.0);
  tgTorso.add(tgHead);

  for (const tx of [-0.15, 0.15]) {
    const tArm = new THREE.Mesh(bomSleeveGeom, avMats.jacketMat);
    tArm.position.set(tx, 0.18, 0.22);
    tArm.rotation.x = Math.PI * 0.42;
    tailGunnerGroup.add(tArm);
  }
  tailGunnerGroup.add(tgTorso);
  group.add(tailGunnerGroup);

  // Zero-GC per-frame IK scratch vectors
  const shCapL = new THREE.Vector3();
  const shCapR = new THREE.Vector3();
  const shCpL = new THREE.Vector3();
  const shCpR = new THREE.Vector3();
  const wrCapL = new THREE.Vector3();
  const wrCapR = new THREE.Vector3();
  const wrCpL = new THREE.Vector3();
  const wrCpR = new THREE.Vector3();

  const poleLeft = new THREE.Vector3(-0.38, -1.0, 0.26).normalize();
  const poleRight = new THREE.Vector3(0.38, -1.0, 0.26).normalize();
  const throttleHandUp = new THREE.Vector3(-0.98, 0.18, 0.08).normalize();
  const throttleHandFwd = new THREE.Vector3(-0.08, -0.30, -0.95).normalize();
  const shieldHandUp = new THREE.Vector3(0.15, 0.96, 0.22).normalize();
  const shieldHandFwd = new THREE.Vector3(0.20, 0.18, -0.96).normalize();
  const curHandUp = new THREE.Vector3();
  const curHandFwd = new THREE.Vector3();

  return {
    group,
    aviatorMaterials: avMats,
    update(flightState, activeStationId = "captain") {
      const t = flightState.time;

      capTorso.visible = activeStationId !== "captain";
      bombardierGroup.visible = activeStationId !== "bombardier";
      tailGunnerGroup.visible = activeStationId !== "tail_gunner";

      // 1. Update Rudder Pedals & A-6 Flying Boots
      capLegs.update(flightState.rudderNorm);
      cpLegs.update(flightState.rudderNorm);

      // 2. Update Synchronized Dual Boeing Control Columns & Molded Bakelite Butterfly Wheels
      const colPitch = flightState.yokePitchM * 1.8;
      const wheelRoll = -flightState.yokeRollRad;
      leftYoke.pitchPivot.rotation.x = colPitch;
      rightYoke.pitchPivot.rotation.x = colPitch;
      leftYoke.wheelGroup.rotation.z = wheelRoll;
      rightYoke.wheelGroup.rotation.z = wheelRoll;

      group.updateMatrixWorld(true);

      // Exact 3D wrist socket positions inside the shirt cuffs of the parented hands!
      wrCapL.setFromMatrixPosition(capLeftHand.wristSocket.matrixWorld);
      wrCapR.setFromMatrixPosition(capRightHand.wristSocket.matrixWorld);
      wrCpR.setFromMatrixPosition(cpRightHand.wristSocket.matrixWorld);

      // 3. Torso breathing & shockwave jolt
      const breath = Math.sin(t * 1.75) * 0.0035;
      const bodySwayZ = -flightState.rollDeg * 0.0022 + flightState.shock.cockpitShake[0] * 0.75;
      const torsoY = 0.24 + breath + flightState.shock.cockpitShake[1] * 0.42;
      capTorso.position.y = torsoY;
      capTorso.rotation.z = bodySwayZ;
      cpTorso.position.y = torsoY;
      cpTorso.rotation.z = bodySwayZ;

      shCapL.set(
        ck.captainSeat[0] + ck.ikArm.shoulderOffsetLeft[0],
        ck.captainSeat[1] + torsoY + 0.16,
        ck.captainSeat[2] + 0.04
      );
      shCapR.set(
        ck.captainSeat[0] + ck.ikArm.shoulderOffsetRight[0],
        ck.captainSeat[1] + torsoY + 0.16,
        ck.captainSeat[2] + 0.04
      );
      shCpL.set(
        ck.copilotSeat[0] + ck.ikArm.shoulderOffsetLeft[0],
        ck.copilotSeat[1] + torsoY + 0.16,
        ck.copilotSeat[2] + 0.04
      );
      shCpR.set(
        ck.copilotSeat[0] + ck.ikArm.shoulderOffsetRight[0],
        ck.copilotSeat[1] + torsoY + 0.16,
        ck.copilotSeat[2] + 0.04
      );

      // Copilot Left Hand: manages R-3350 throttles & raises to shield eyes at flash!
      const dtBurst = t - detonationTime;
      const shieldWeight =
        dtBurst > 0 && dtBurst < 5.2
          ? Math.sin(Math.min(1, dtBurst / 0.35) * Math.PI * 0.5) * Math.exp(-Math.max(0, dtBurst - 1.3) * 0.68)
          : 0.0;

      const thX = 0.035;
      const thY = -0.108 + flightState.throttle * 0.035;
      const thZ = -3.39 - flightState.throttle * 0.075;
      wrCpL.set(
        thX * (1 - shieldWeight) + (ck.copilotSeat[0] - 0.08) * shieldWeight,
        thY * (1 - shieldWeight) + 0.36 * shieldWeight,
        thZ * (1 - shieldWeight) + -3.26 * shieldWeight
      );
      curHandUp.lerpVectors(throttleHandUp, shieldHandUp, shieldWeight).normalize();
      curHandFwd.lerpVectors(throttleHandFwd, shieldHandFwd, shieldWeight).normalize();

      // 4. Solve Two-Bone Analytical IK connecting Shoulders -> Elbows -> Buttoned Shirt Cuffs!
      capLeftArmIK.update(shCapL, wrCapL, poleLeft);
      capRightArmIK.update(shCapR, wrCapR, poleRight);
      cpLeftArmIK.update(shCpL, wrCpL, poleLeft, curHandUp, curHandFwd);
      cpRightArmIK.update(shCpR, wrCpR, poleRight);

      // 5. Copilot & Bombardier natural head motion
      let cpYaw = 0.10 * Math.sin(t * 0.42);
      let cpPitch = -0.08;
      if (t > releaseTime && t < releaseTime + 28.0) {
        cpYaw = -0.24;
        cpPitch = -0.12;
      } else if (dtBurst >= 0 && dtBurst < 6.0) {
        cpYaw = 0.45 - shieldWeight * 0.35;
        cpPitch = -0.04;
      } else if (t >= 114.0) {
        cpYaw = 0.65;
        cpPitch = -0.05;
      }
      cpHead.rotation.set(cpPitch, cpYaw, 0, "YXZ");
      bomHead.rotation.y = Math.sin(t * 0.55) * 0.06;
    },
  };
}
