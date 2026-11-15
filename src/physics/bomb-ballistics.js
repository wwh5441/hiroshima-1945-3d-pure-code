// Physical RK4 Compressible Aerodynamic Ballistics Solver for Mk-1 "Little Boy" (4,400 kg)
// Integrates ISA atmospheric density rho(h), speed of sound a(h), gravity g = 9.80665 m/s^2,
// altitude-sheared wind vector W(h), and quadratic + transonic wave drag Fd = 0.5 * rho(h) * v_rel^2 * Cd(M) * A.

const G_ACCEL = 9.80665;
const DEG2RAD = Math.PI / 180.0;

export function sampleAtmosphereISA(altM) {
  const h = Math.max(0.0, Math.min(11000.0, altM));
  const tempK = 288.15 - 0.0065 * h;
  const rho = 1.225 * Math.pow(tempK / 288.15, 4.25588);
  const soundSpeed = Math.sqrt(1.4 * 287.05 * tempK);
  return { rho, soundSpeed, tempK };
}

export function sampleWindVectorMps(altM, windCfg) {
  const fromRad = windCfg.fromHeadingDeg * DEG2RAD;
  // Wind blowing FROM fromHeadingDeg pushes air mass in opposite direction:
  const wxFull = -Math.sin(fromRad) * windCfg.speedAtReleaseMps;
  const wzFull = Math.cos(fromRad) * windCfg.speedAtReleaseMps;
  const span = Math.max(100.0, 9467.0 - windCfg.shearBaseAltM);
  const u = Math.max(0.0, Math.min(1.0, (altM - windCfg.shearBaseAltM) / span));
  const scale = Math.pow(u, windCfg.shearExp);
  return [wxFull * scale, 0.0, wzFull * scale];
}

export class BombBallistics {
  constructor(mission) {
    this.tRelease = mission.releaseTime;
    this.tDet = mission.detonationTime;
    this.fallDuration = this.tDet - this.tRelease; // 44.40 s
    this.burstOrigin = [...mission.burstOrigin];
    this.windCfg = mission.wind;
    this.spec = mission.bombSpec;

    this.dt = 0.01; // 10ms RK4 integration step
    this.steps = Math.round(this.fallDuration / this.dt);
    this.area = Math.PI * Math.pow(this.spec.diameterM * 0.5, 2.0);

    // Release aircraft ground velocity vector at 31,060 ft (TAS 328 mph + 43 mph Westerly headwind = 285 mph GS)
    const hdgRad = mission.initialHeadingDeg * DEG2RAD;
    const [wx0, , wz0] = sampleWindVectorMps(mission.releaseAltitudeM, this.windCfg);
    this.releaseVel = [
      Math.sin(hdgRad) * mission.initialTasMps + wx0,
      0.0,
      -Math.cos(hdgRad) * mission.initialTasMps + wz0,
    ];

    // Calibrate transonic wave drag coefficient via bisection so RK4 lands within <1mm of burstOrigin[1] (580.0m)
    this.calibratedWaveCd = this._calibrateWaveDrag(mission.releaseAltitudeM, this.burstOrigin[1]);

    // Forward RK4 integration from relative origin (0, releaseAlt, 0) to get exact physical bomb lead (~5,498m)
    const relSamples = this._integrateRK4([0.0, mission.releaseAltitudeM, 0.0], this.calibratedWaveCd);
    const endRel = relSamples[relSamples.length - 1];

    // Exact physical release point so Little Boy detonates directly above Shima Hospital [0, 580, 0]
    this.releasePosition = [
      this.burstOrigin[0] - endRel.x,
      mission.releaseAltitudeM,
      this.burstOrigin[2] - endRel.z,
    ];
    this.horizontalLeadM = Math.hypot(this.releasePosition[0] - this.burstOrigin[0], this.releasePosition[2] - this.burstOrigin[2]);

    // Store full world-space RK4 trajectory table
    this.samples = this._integrateRK4(this.releasePosition, this.calibratedWaveCd);
  }

  _deriv(s, waveCd) {
    const [x, y, z, vx, vy, vz] = s;
    const [wx, wy, wz] = sampleWindVectorMps(y, this.windCfg);
    const rx = vx - wx;
    const ry = vy - wy;
    const rz = vz - wz;
    const vRel = Math.hypot(rx, ry, rz);

    const { rho, soundSpeed } = sampleAtmosphereISA(y);
    const mach = vRel / Math.max(200.0, soundSpeed);
    const dMach = Math.max(0.0, mach - this.spec.dragMachCrit);
    const cd = this.spec.subsonicCd + waveCd * dMach * dMach;
    const dragFactor = (0.5 * rho * cd * this.area) / this.spec.massKg;

    return [
      vx,
      vy,
      vz,
      -dragFactor * vRel * rx,
      -G_ACCEL - dragFactor * vRel * ry,
      -dragFactor * vRel * rz,
      x, // unused placeholder clarity
    ];
  }

  _integrateRK4(startPos, waveCd) {
    const dt = this.dt;
    let state = [
      startPos[0],
      startPos[1],
      startPos[2],
      this.releaseVel[0],
      this.releaseVel[1],
      this.releaseVel[2],
    ];
    const out = new Array(this.steps + 1);
    out[0] = {
      x: state[0],
      y: state[1],
      z: state[2],
      vx: state[3],
      vy: state[4],
      vz: state[5],
    };

    for (let i = 1; i <= this.steps; i++) {
      const k1 = this._deriv(state, waveCd);
      const s2 = [
        state[0] + 0.5 * dt * k1[0],
        state[1] + 0.5 * dt * k1[1],
        state[2] + 0.5 * dt * k1[2],
        state[3] + 0.5 * dt * k1[3],
        state[4] + 0.5 * dt * k1[4],
        state[5] + 0.5 * dt * k1[5],
      ];
      const k2 = this._deriv(s2, waveCd);
      const s3 = [
        state[0] + 0.5 * dt * k2[0],
        state[1] + 0.5 * dt * k2[1],
        state[2] + 0.5 * dt * k2[2],
        state[3] + 0.5 * dt * k2[3],
        state[4] + 0.5 * dt * k2[4],
        state[5] + 0.5 * dt * k2[5],
      ];
      const k3 = this._deriv(s3, waveCd);
      const s4 = [
        state[0] + dt * k3[0],
        state[1] + dt * k3[1],
        state[2] + dt * k3[2],
        state[3] + dt * k3[3],
        state[4] + dt * k3[4],
        state[5] + dt * k3[5],
      ];
      const k4 = this._deriv(s4, waveCd);

      for (let j = 0; j < 6; j++) {
        state[j] += (dt / 6.0) * (k1[j] + 2.0 * k2[j] + 2.0 * k3[j] + k4[j]);
      }
      out[i] = {
        x: state[0],
        y: state[1],
        z: state[2],
        vx: state[3],
        vy: state[4],
        vz: state[5],
      };
    }
    return out;
  }

  _calibrateWaveDrag(startAltM, targetAltM) {
    let lo = 0.05;
    let hi = 45.0;
    for (let iter = 0; iter < 36; iter++) {
      const mid = 0.5 * (lo + hi);
      const traj = this._integrateRK4([0, startAltM, 0], mid);
      const endY = traj[traj.length - 1].y;
      if (endY > targetAltM) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    return 0.5 * (lo + hi);
  }

  evaluate(t, currentAircraftPos, currentAircraftHdgDeg) {
    const hdgRad = (currentAircraftHdgDeg ?? 266.0) * DEG2RAD;
    if (t < this.tRelease) {
      // Captive inside forward bomb bay rack prior to t = 22.0s
      const pos = currentAircraftPos ? [...currentAircraftPos] : [...this.releasePosition];
      return {
        released: false,
        detonated: false,
        visibleInWorld: false,
        visibleInBay: true,
        bayDropOffsetM: 0.0,
        position: pos,
        velocity: [...this.releaseVel],
        pitchRad: 0.0,
        yawRad: -hdgRad,
      };
    }

    if (t >= this.tDet) {
      const last = this.samples[this.steps];
      const vH = Math.hypot(last.vx, last.vz) || 1.0;
      return {
        released: true,
        detonated: true,
        visibleInWorld: false,
        visibleInBay: false,
        bayDropOffsetM: 9000.0,
        position: [...this.burstOrigin],
        velocity: [last.vx, last.vy, last.vz],
        pitchRad: Math.atan2(last.vy, vH),
        yawRad: Math.atan2(-last.vx, -last.vz),
      };
    }

    const f = (t - this.tRelease) / this.dt;
    const i0 = Math.min(this.steps, Math.max(0, Math.floor(f)));
    const i1 = Math.min(this.steps, i0 + 1);
    const a = f - i0;
    const s0 = this.samples[i0];
    const s1 = this.samples[i1];

    const x = s0.x + (s1.x - s0.x) * a;
    const y = s0.y + (s1.y - s0.y) * a;
    const z = s0.z + (s1.z - s0.z) * a;
    const vx = s0.vx + (s1.vx - s0.vx) * a;
    const vy = s0.vy + (s1.vy - s0.vy) * a;
    const vz = s0.vz + (s1.vz - s0.vz) * a;
    const vHoriz = Math.hypot(vx, vz) || 1.0;

    // For first 2.2s (drop < 24m), render in aircraft Pass-2 depth space so bomb exits open clamshell doors cleanly!
    const dtFall = t - this.tRelease;
    const inNearBay = dtFall < 2.2;

    return {
      released: true,
      detonated: false,
      visibleInWorld: !inNearBay,
      visibleInBay: inNearBay,
      bayDropOffsetM: currentAircraftPos ? currentAircraftPos[1] - y : 0.5 * G_ACCEL * dtFall * dtFall,
      position: [x, y, z],
      velocity: [vx, vy, vz],
      pitchRad: Math.atan2(vy, vHoriz),
      yawRad: Math.atan2(-vx, -vz),
    };
  }
}
