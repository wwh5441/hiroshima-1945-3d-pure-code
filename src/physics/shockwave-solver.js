// Physical 15-kt Airburst Blast Wave & Ground-Reflected Mach Wave Solver
// Models early Sedov-Taylor / Rankine-Hugoniot supersonic overpressure propagation transitioning
// into warm August 6, 1945 Hiroshima tropospheric acoustic propagation, intercepting Enola Gay
// from astern-below ("Flak!") at ~18.5 km slant range ~43.0s & ~44.6s after detonation (t ~ 109.4s & 111.0s).

export class ShockwaveSolver {
  constructor(mission, getAircraftPosAtTime) {
    this.tDet = mission.detonationTime;
    this.duration = mission.durationSeconds;
    this.burst = [...mission.burstOrigin]; // [0, 580, 0]
    this.mirrorBurst = [this.burst[0], -this.burst[1], this.burst[2]]; // [0, -580, 0]

    // August 6, 1945 warm summer maritime air (+27°C surface) integrated acoustic speed + 15-kt supersonic Mach lead
    // Calibrated to exact 15-kt blast time-of-arrival curve reaching 18.54 km slant range in 43.0s (t = 109.4s)
    this.effectiveAcousticSpeed = 351.5;
    this.supersonicLeadM = 3425.0;
    this.leadDecayRate = 0.52;

    // Separate surface-level Mach-stem blast radius curve for realistic 1945 city destruction propagation
    this.groundSoundSpeed = 346.0;
    this.groundSupersonicLeadM = 860.0;

    this.shock1Time = this._findIntercept(this.burst, getAircraftPosAtTime);
    this.shock2Time = this._findIntercept(this.mirrorBurst, getAircraftPosAtTime);
  }

  blastRadiusAt(dt) {
    if (dt <= 0) return 0.0;
    const lead = this.supersonicLeadM * (1.0 - Math.exp(-dt * this.leadDecayRate));
    return lead + this.effectiveAcousticSpeed * dt;
  }

  surfaceBlastRadiusAt(dt) {
    if (dt <= 0) return 0.0;
    const r3d = this.groundSupersonicLeadM * (1.0 - Math.exp(-dt * 1.65)) + this.groundSoundSpeed * dt;
    return r3d > this.burst[1]
      ? Math.sqrt(Math.max(0, r3d * r3d - this.burst[1] * this.burst[1]))
      : 0.0;
  }

  _findIntercept(origin, getAircraftPosAtTime) {
    for (let t = this.tDet + 0.05; t <= this.duration; t += 0.02) {
      const rWave = this.blastRadiusAt(t - this.tDet);
      const pos = getAircraftPosAtTime(t);
      const d = Math.hypot(pos[0] - origin[0], pos[1] - origin[1], pos[2] - origin[2]);
      if (rWave >= d) {
        return t;
      }
    }
    return this.tDet + 43.5;
  }

  evaluate(t, aircraftPos, aircraftHeadingDeg = 62.8) {
    const dt = t - this.tDet;
    const slantDist = Math.hypot(
      aircraftPos[0] - this.burst[0],
      aircraftPos[1] - this.burst[1],
      aircraftPos[2] - this.burst[2]
    );

    if (dt < 0) {
      return {
        active: false,
        dt: 0,
        slantRangeKm: slantDist * 0.001,
        primaryRadius: 0,
        groundWaveRadius: 0,
        cloudClearRadius: 0,
        wilsonRadius: 0,
        wilsonOpacity: 0,
        flashIntensity: 0,
        fireballTempNorm: 0,
        cockpitShake: [0, 0, 0], // [lateralX, verticalY, longitudinalForeZ]
        tailPitchUpDeg: 0,
        shockGSpike: 0,
        etaSeconds: 0,
      };
    }

    const primaryRadius = this.blastRadiusAt(dt);
    const groundWaveRadius = this.surfaceBlastRadiusAt(dt);

    // Cloud deck clearance around 2,350m MSL
    const dyCloud = 2350.0 - this.burst[1];
    const rAtCloud = this.groundSupersonicLeadM * (1.0 - Math.exp(-dt * 1.4)) + 338.0 * dt;
    const cloudClearRadius = rAtCloud > dyCloud
      ? Math.sqrt(Math.max(0, rAtCloud * rAtCloud - dyCloud * dyCloud))
      : 0.0;

    // Spherical Wilson Condensation Vapor Shell (0.25s .. 6.4s after burst)
    const wilsonRadius = Math.min(5200.0, rAtCloud * 0.98);
    const wilsonOpacity = dt < 6.4
      ? Math.sin(Math.min(1.0, dt / 0.40) * Math.PI * 0.5) * Math.exp(-Math.max(0, dt - 0.95) * 0.65)
      : 0.0;

    // Authentic 15-kt Double Thermal Pulse (Pulse 1: 0.04s UV spike -> minimum -> Pulse 2: 0.38s thermal max)
    const p1 = Math.exp(-Math.pow((dt - 0.04) / 0.045, 2.0)) * 1.45;
    const p2 = Math.pow(Math.max(0, dt / 0.38), 1.4) * Math.exp(-Math.max(0, dt - 0.38) * 1.15) * 2.95;
    const afterglow = Math.exp(-dt * 0.085) * 0.44;
    const flashIntensity = p1 + p2 + afterglow;

    const etaSeconds = Math.max(0, (slantDist - primaryRadius) / this.effectiveAcousticSpeed);

    // Directional Rear-Aspect ("Flak!") Tail-Slap Shockwave Vector in Aircraft Local Space:
    // Wave propagates from burst [0,580,0] toward aircraft [x,y,z] -> hits tail (+Z) from below (-Y) pushing nose DOWN / tail UP first!
    const hdgRad = (aircraftHeadingDeg * Math.PI) / 180.0;
    const dirWorldX = (aircraftPos[0] - this.burst[0]) / Math.max(1.0, slantDist);
    const dirWorldZ = (aircraftPos[2] - this.burst[2]) / Math.max(1.0, slantDist);
    // Project horizontal propagation onto aircraft Forward = (sin(hdg), -cos(hdg)) and Right = (cos(hdg), sin(hdg))
    const foreProj = dirWorldX * Math.sin(hdgRad) - dirWorldZ * Math.cos(hdgRad); // ~ +1.0 when chased from dead astern!
    const rightProj = dirWorldX * Math.cos(hdgRad) + dirWorldZ * Math.sin(hdgRad);

    let shakeX = 0;
    let shakeY = 0;
    let shakeZ = 0;
    let tailPitchUpDeg = 0;
    let shockG = 0;

    const applyHit = (tHit, amp, freq) => {
      const s = t - tHit;
      if (s >= 0 && s < 4.6) {
        const env = Math.exp(-s * 1.38) * (1.0 - Math.exp(-s * 42.0));
        // Strong upward vertical heave + forward longitudinal surge (-Z local) + tail-lifting pitch impulse!
        shakeX += amp * (0.45 + 0.55 * Math.abs(rightProj)) * env * (Math.sin(s * freq) + 0.4 * Math.cos(s * freq * 2.3));
        shakeY += amp * 1.45 * env * (Math.cos(s * freq * 1.15) + 0.5 * Math.sin(s * freq * 3.05));
        shakeZ -= amp * 1.25 * foreProj * env * Math.cos(s * freq * 0.92);
        tailPitchUpDeg -= amp * 48.0 * foreProj * Math.exp(-s * 2.1) * Math.cos(s * 9.5);
        shockG += amp * 27.5 * Math.exp(-s * 2.3) * Math.cos(s * 14.0);
      }
    };

    applyHit(this.shock1Time, 0.072, 26.0); // Direct blast wave ("Flak!" tail slap at ~109.4s)
    applyHit(this.shock2Time, 0.054, 22.0); // Ground-reflected wave (~111.0s)

    return {
      active: true,
      dt,
      slantRangeKm: slantDist * 0.001,
      primaryRadius,
      groundWaveRadius,
      cloudClearRadius,
      wilsonRadius,
      wilsonOpacity,
      flashIntensity,
      fireballTempNorm: Math.exp(-dt * 0.055),
      cockpitShake: [shakeX, shakeY, shakeZ],
      tailPitchUpDeg,
      shockGSpike: shockG,
      etaSeconds,
    };
  }
}
