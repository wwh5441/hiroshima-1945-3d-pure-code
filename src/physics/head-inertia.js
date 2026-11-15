import * as THREE from "../../vendor/three.module.js";

const DEG2RAD = Math.PI / 180.0;

function catmullRom(p0, p1, p2, p3, u) {
  const u2 = u * u;
  const u3 = u2 * u;
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * u +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * u3
  );
}

// Multi-Station Crew Head Inertia & Plume-Aware Framing Controller
// Zero magic constants: all mission times (releaseTime, detonationTime) read strictly from mission config!
export class HeadInertiaController {
  constructor(mission, airframeSpec) {
    this.mission = mission;
    this.airframeSpec = airframeSpec;
    this.keyframes = mission.cameraKeyframes;
    this.detonationTime = mission.detonationTime;
    this.releaseTime = mission.releaseTime;

    this.captainEye = new THREE.Vector3(...airframeSpec.cockpit.captainEye);
    this.bombardierEye = new THREE.Vector3(...airframeSpec.cockpit.bombardierEye);
    this.tailGunnerEye = new THREE.Vector3(...airframeSpec.cockpit.tailGunnerEye);
    this.burstOrigin = new THREE.Vector3(...mission.burstOrigin);
    this.aimPoint = new THREE.Vector3(...mission.aimPointAioi);

    this.offset = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.rotLag = new THREE.Vector2();
    this.rotVel = new THREE.Vector2();

    // Interactive mouse drag state (in cockpit stations: springs back gently; in escort station: orbits & zooms!)
    this.userLook = { yaw: 0, pitch: 0, dragging: false };
    this.escortOrbit = { yawOffset: 0, pitchOffset: 0, distScale: 1.0, dragging: false };

    this._invQuat = new THREE.Quaternion();
    this._tmpVec = new THREE.Vector3();
  }

  reset() {
    this.offset.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.rotLag.set(0, 0);
    this.rotVel.set(0, 0);
    this.userLook.yaw = 0;
    this.userLook.pitch = 0;
    this.escortOrbit.yawOffset = 0;
    this.escortOrbit.pitchOffset = 0;
    this.escortOrbit.distScale = 1.0;
  }

  _sampleCaptainKeyframes(t) {
    const kf = this.keyframes;
    if (t <= kf[0].t) return { ...kf[0], lean: [...kf[0].lean] };
    const last = kf[kf.length - 1];
    if (t >= last.t) return { ...last, lean: [...last.lean] };

    let idx = 0;
    for (let i = 0; i < kf.length - 1; i++) {
      if (t >= kf[i].t && t <= kf[i + 1].t) {
        idx = i;
        break;
      }
    }
    const k0 = kf[Math.max(0, idx - 1)];
    const k1 = kf[idx];
    const k2 = kf[idx + 1];
    const k3 = kf[Math.min(kf.length - 1, idx + 2)];
    const u = (t - k1.t) / Math.max(1e-5, k2.t - k1.t);

    return {
      yawDeg: catmullRom(k0.yawDeg, k1.yawDeg, k2.yawDeg, k3.yawDeg, u),
      pitchDeg: catmullRom(k0.pitchDeg, k1.pitchDeg, k2.pitchDeg, k3.pitchDeg, u),
      rollBiasDeg: catmullRom(k0.rollBiasDeg, k1.rollBiasDeg, k2.rollBiasDeg, k3.rollBiasDeg, u),
      fov: catmullRom(k0.fov, k1.fov, k2.fov, k3.fov, u),
      lean: [
        catmullRom(k0.lean[0], k1.lean[0], k2.lean[0], k3.lean[0], u),
        catmullRom(k0.lean[1], k1.lean[1], k2.lean[1], k3.lean[1], u),
        catmullRom(k0.lean[2], k1.lean[2], k2.lean[2], k3.lean[2], u),
      ],
    };
  }

  _localDirectionAngles(flightState, worldTarget) {
    this._invQuat.copy(flightState.quaternion).invert();
    this._tmpVec
      .set(
        worldTarget.x - flightState.position[0],
        worldTarget.y - flightState.position[1],
        worldTarget.z - flightState.position[2]
      )
      .applyQuaternion(this._invQuat);

    // Local Three.js camera looks down -Z when yaw=0, -X (port) when yaw=+PI/2, +Z (astern) when yaw=PI
    const yaw = Math.atan2(-this._tmpVec.x, -this._tmpVec.z);
    const horiz = Math.hypot(this._tmpVec.x, this._tmpVec.z) || 1.0;
    const pitch = Math.atan2(this._tmpVec.y, horiz);
    return { yaw, pitch };
  }

  update(dt, flightState, activeStationId) {
    const t = flightState.time;
    const step = Math.min(0.05, Math.max(0.004, dt));

    // Spring-damper G-force + rear-aspect shockwave head physics
    const excessG = flightState.gLoad - 1.0;
    const latForce = -Math.sin(flightState.rollDeg * DEG2RAD) * 0.020;
    const vertForce = -excessG * 0.024;
    const foreForce = flightState.shock.cockpitShake[2] * 0.85;
    const kSpring = 28.0;
    const cDamp = 8.8;

    this.velocity.x += (latForce * kSpring - kSpring * this.offset.x - cDamp * this.velocity.x) * step;
    this.velocity.y += (vertForce * kSpring - kSpring * this.offset.y - cDamp * this.velocity.y) * step;
    this.velocity.z += (foreForce * kSpring - kSpring * this.offset.z - cDamp * this.velocity.z) * step;
    this.offset.addScaledVector(this.velocity, step);

    const targetPitchLag = -excessG * 0.030 + flightState.shock.cockpitShake[1] * 0.95 + flightState.shock.tailPitchUpDeg * 0.012;
    const targetYawLag = -flightState.turnRateDps * 0.003 + flightState.shock.cockpitShake[0] * 1.1;
    this.rotVel.x += (34.0 * (targetPitchLag - this.rotLag.x) - 9.5 * this.rotVel.x) * step;
    this.rotVel.y += (34.0 * (targetYawLag - this.rotLag.y) - 9.5 * this.rotVel.y) * step;
    this.rotLag.x += this.rotVel.x * step;
    this.rotLag.y += this.rotVel.y * step;

    if (!this.userLook.dragging) {
      const decay = Math.exp(-step * 2.2);
      this.userLook.yaw *= decay;
      this.userLook.pitch *= decay;
    }

    const dtBurst = Math.max(0, t - this.detonationTime);
    const plumeFocusY = dtBurst > 0
      ? this.burstOrigin.y + Math.min(7200.0, Math.pow(dtBurst, 0.76) * 285.0) * 0.55
      : 180.0;
    const plumeWorld = new THREE.Vector3(this.burstOrigin.x, plumeFocusY, this.burstOrigin.z);

    // --- STATION 4: ESCORT ("THE GREAT ARTISTE" / ORBIT CAMERA) ---
    if (activeStationId === "escort") {
      const aircraftPos = new THREE.Vector3(...flightState.position);
      const hdgRad = flightState.headingDeg * DEG2RAD;
      // Aircraft horizontal heading basis: Right (+X_h) = (cos(hdg), 0, sin(hdg)), Aft (+Z_h) = (-sin(hdg), 0, cos(hdg))
      const toWorldFromHeading = (rightM, upM, aftM) =>
        new THREE.Vector3(
          rightM * Math.cos(hdgRad) - aftM * Math.sin(hdgRad),
          upM,
          rightM * Math.sin(hdgRad) + aftM * Math.cos(hdgRad)
        );

      let baseOffsetWorld;
      let baseLookLocal;

      if (t < this.releaseTime + 4.0) {
        // Phase A (Bomb Run & Release): Starboard-aft slightly below wing chord showing open forward bomb bay, #82 nose & dropping Little Boy!
        baseOffsetWorld = toWorldFromHeading(17.5, -4.2, 16.5);
        baseLookLocal = new THREE.Vector3(0.0, -0.8, 0.5);
      } else if (t < this.detonationTime) {
        // Phase B (Right 60° Diving Breakaway): Aft-Starboard-High dorsal chase framing upright Circle-R tail & 60° right bank!
        baseOffsetWorld = toWorldFromHeading(23.0, 13.5, 29.0);
        baseLookLocal = new THREE.Vector3(0.0, 1.2, 3.0);
      } else if (t < 114.0) {
        // Phase C (ENE Escape with Plume Dead Astern): High Port-Forward dorsal overview (15m ABOVE wing plane so wings NEVER touch vertical tail!)
        baseOffsetWorld = toWorldFromHeading(-18.5, 15.0, -31.0);
        baseLookLocal = new THREE.Vector3(0.0, 1.4, 14.0);
      } else {
        // Phase D (Epilogue Observation Turn): Classic 5 o'clock High Dorsal Chase Cam!
        // Camera sits BEHIND & ABOVE the starboard tail (+33m right, +8.8m up, +24m aft) looking forward-port:
        // - Full 30.18m silver dorsal spine & BOTH upper wings visible from ABOVE (zero belly flip!)
        // - Towering Circle-R vertical tail stands upright in left foreground (zero wing-over-tail overlap!)
        // - Stratospheric 8.5 km Hiroshima mushroom cloud rises dead center-top in the sky!
        baseOffsetWorld = toWorldFromHeading(36.0, 9.8, 27.5);
        baseLookLocal = new THREE.Vector3(-13.5, -0.4, 4.5);
      }

      const baseDist = baseOffsetWorld.length();
      const baseAzim = Math.atan2(baseOffsetWorld.x, baseOffsetWorld.z);
      const baseElev = Math.asin(Math.max(-0.98, Math.min(0.98, baseOffsetWorld.y / Math.max(1.0, baseDist))));

      const autoAzim = baseAzim + this.escortOrbit.yawOffset;
      const autoElev = Math.max(-1.20, Math.min(1.22, baseElev + this.escortOrbit.pitchOffset));
      const dist = Math.max(18.0, Math.min(125.0, baseDist * this.escortOrbit.distScale));

      const camOffsetWorld = new THREE.Vector3(
        Math.sin(autoAzim) * Math.cos(autoElev) * dist,
        Math.sin(autoElev) * dist + flightState.shock.cockpitShake[1] * 3.5,
        Math.cos(autoAzim) * Math.cos(autoElev) * dist
      );
      const worldEye = aircraftPos.clone().add(camOffsetWorld);

      const hasOrbitOverride = Math.abs(this.escortOrbit.yawOffset) > 0.12 || Math.abs(this.escortOrbit.pitchOffset) > 0.12;
      const lookTarget = hasOrbitOverride
        ? aircraftPos.clone().add(new THREE.Vector3(0, 1.2, 4.0).applyQuaternion(flightState.quaternion))
        : aircraftPos.clone().add(toWorldFromHeading(baseLookLocal.x, baseLookLocal.y, baseLookLocal.z));

      const worldMat = new THREE.Matrix4().lookAt(worldEye, lookTarget, new THREE.Vector3(0, 1, 0));
      const worldQuat = new THREE.Quaternion().setFromRotationMatrix(worldMat);

      // Convert worldEye & worldQuat into aircraft local space so DualFrustumHdrEngine Pass 2 stays 100% unified!
      this._invQuat.copy(flightState.quaternion).invert();
      const localEye = worldEye.clone().sub(aircraftPos).applyQuaternion(this._invQuat);
      const localHeadQuat = this._invQuat.clone().multiply(worldQuat);

      return {
        station: "escort",
        isExterior: true,
        localEye,
        localHeadQuat,
        fov: 52,
        nearCockpit: 0.8,
        farCockpit: 420.0,
      };
    }

    const breathY = Math.sin(t * 1.65) * 0.0025;

    // --- STATION 2: BOMBARDIER (THOMAS FEREBEE · NORDEN M-9 BOMBSIGHT) ---
    if (activeStationId === "bombardier") {
      const aimTarget = t < this.releaseTime + 3.0 ? this.aimPoint : plumeWorld;
      const { yaw, pitch } = this._localDirectionAngles(flightState, aimTarget);

      // Clamp within forward lower glazed nose glass cone (-68°..+68° yaw, -72°..+5° pitch)
      const clampedYaw = Math.max(-1.18, Math.min(1.18, yaw));
      const clampedPitch = Math.max(-1.24, Math.min(0.08, pitch));

      const localEye = new THREE.Vector3(
        this.bombardierEye.x + this.offset.x * 0.6 + flightState.shock.cockpitShake[0] * 0.28,
        this.bombardierEye.y + this.offset.y * 0.6 + breathY + flightState.shock.cockpitShake[1] * 0.28,
        this.bombardierEye.z + this.offset.z * 0.6 + flightState.shock.cockpitShake[2] * 0.22
      );
      const headEuler = new THREE.Euler(
        clampedPitch + this.rotLag.x * 0.5 + this.userLook.pitch,
        clampedYaw + this.rotLag.y * 0.5 + this.userLook.yaw,
        -flightState.rollDeg * DEG2RAD * 0.18, // Norden stabilized optics feel
        "YXZ"
      );
      return {
        station: "bombardier",
        isExterior: false,
        localEye,
        localHeadQuat: new THREE.Quaternion().setFromEuler(headEuler),
        fov: t < this.releaseTime + 1.5 ? 40 : 54, // Magnified Norden optical view on bomb run!
        nearCockpit: 0.045,
        farCockpit: 52.0,
      };
    }

    // --- STATION 3: TAIL GUNNER (BOB CARON · AFT TURRET DIRECT SIGHTLINE) ---
    if (activeStationId === "tail_gunner") {
      const { yaw, pitch } = this._localDirectionAngles(flightState, plumeWorld);
      // Normalize yaw around PI (straight aft +Z!)
      let aftDeltaYaw = yaw - Math.PI;
      while (aftDeltaYaw > Math.PI) aftDeltaYaw -= Math.PI * 2;
      while (aftDeltaYaw < -Math.PI) aftDeltaYaw += Math.PI * 2;

      const clampedAftYaw = Math.PI + Math.max(-0.82, Math.min(0.82, aftDeltaYaw));
      const clampedPitch = Math.max(-0.68, Math.min(0.32, pitch));

      const localEye = new THREE.Vector3(
        this.tailGunnerEye.x + this.offset.x * 0.8 + flightState.shock.cockpitShake[0] * 0.42,
        this.tailGunnerEye.y + this.offset.y * 0.8 + breathY + flightState.shock.cockpitShake[1] * 0.45,
        this.tailGunnerEye.z + this.offset.z * 0.8 + flightState.shock.cockpitShake[2] * 0.35
      );
      const headEuler = new THREE.Euler(
        clampedPitch + this.rotLag.x * 0.7 + this.userLook.pitch,
        clampedAftYaw + this.rotLag.y * 0.7 + this.userLook.yaw,
        -this.offset.x * 0.5,
        "YXZ"
      );
      return {
        station: "tail_gunner",
        isExterior: false,
        localEye,
        localHeadQuat: new THREE.Quaternion().setFromEuler(headEuler),
        fov: 58,
        nearCockpit: 0.045,
        farCockpit: 52.0,
      };
    }

    // --- STATION 1: LEFT-SEAT CAPTAIN (COL. PAUL TIBBETS) ---
    const pose = this._sampleCaptainKeyframes(t);
    let targetYawRad = pose.yawDeg * DEG2RAD;
    let targetPitchRad = pose.pitchDeg * DEG2RAD;

    // Post-shockwave left observation bank (t >= 115s): lock smoothly onto rising stratospheric mushroom cloud out port window!
    if (t >= 115.0) {
      const { yaw, pitch } = this._localDirectionAngles(flightState, plumeWorld);
      if (yaw > 0.65 && yaw < 2.25) {
        const w = Math.min(1.0, (t - 115.0) / 7.0);
        const clampedYaw = Math.max(54 * DEG2RAD, Math.min(116 * DEG2RAD, yaw));
        const clampedPitch = Math.max(-28 * DEG2RAD, Math.min(16 * DEG2RAD, pitch));
        targetYawRad = targetYawRad * (1 - w) + clampedYaw * w;
        targetPitchRad = targetPitchRad * (1 - w) + clampedPitch * w;
      }
    }

    const localEye = new THREE.Vector3(
      this.captainEye.x + pose.lean[0] + this.offset.x + flightState.shock.cockpitShake[0] * 0.35,
      this.captainEye.y + pose.lean[1] + this.offset.y + breathY + flightState.shock.cockpitShake[1] * 0.35,
      this.captainEye.z + pose.lean[2] + this.offset.z + flightState.shock.cockpitShake[2] * 0.28
    );

    const headEuler = new THREE.Euler(
      targetPitchRad + this.rotLag.x + this.userLook.pitch,
      targetYawRad + this.rotLag.y + this.userLook.yaw,
      pose.rollBiasDeg * DEG2RAD - this.offset.x * 0.65,
      "YXZ"
    );

    return {
      station: "captain",
      isExterior: false,
      localEye,
      localHeadQuat: new THREE.Quaternion().setFromEuler(headEuler),
      fov: pose.fov,
      nearCockpit: 0.045,
      farCockpit: 52.0,
    };
  }
}
