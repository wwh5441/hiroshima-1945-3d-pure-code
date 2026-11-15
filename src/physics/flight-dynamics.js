import * as THREE from "../../vendor/three.module.js";
import { BombBallistics, sampleWindVectorMps } from "./bomb-ballistics.js";
import { ShockwaveSolver } from "./shockwave-solver.js";

const G_ACCEL = 9.80665;
const DEG2RAD = Math.PI / 180.0;
const RAD2DEG = 180.0 / Math.PI;
const MPS_TO_MPH = 2.23693629;

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function sampleSchedule(schedule, t) {
  if (t <= schedule[0].t) return { ...schedule[0] };
  const last = schedule[schedule.length - 1];
  if (t >= last.t) return { ...last };
  for (let i = 0; i < schedule.length - 1; i++) {
    const a = schedule[i];
    const b = schedule[i + 1];
    if (t >= a.t && t <= b.t) {
      const u = smoothstep(a.t, b.t, t);
      return {
        rollDeg: a.rollDeg + (b.rollDeg - a.rollDeg) * u,
        pitchDeg: a.pitchDeg + (b.pitchDeg - a.pitchDeg) * u,
        tasMps: a.tasMps + (b.tasMps - a.tasMps) * u,
        climbMps: a.climbMps + (b.climbMps - a.climbMps) * u,
        throttle: a.throttle + (b.throttle - a.throttle) * u,
      };
    }
  }
  return { ...last };
}

// Strictly Physics-Driven Coordinated Flight Dynamics:
// Heading turn rate omega = g * tan(roll) / V_tas (zero hardcoded turnRateDps, zero non-physical sideslip!)
// Ground track integrates air-mass velocity + real 31,060-ft Westerly wind vector W(h).
export class FlightDynamics {
  constructor(mission) {
    this.mission = mission;
    this.dt = 1 / 60;
    this.totalSteps = Math.ceil(mission.durationSeconds / this.dt) + 1;
    this.samples = new Array(this.totalSteps);

    // 1. Solve RK4 compressible bomb ballistics first to obtain exact physical releasePosition (~5,498m lead)
    this.bomb = new BombBallistics(mission);
    this.releasePosition = [...this.bomb.releasePosition];

    // 2. Bake coordinated aerodynamic + wind-drifted trajectory anchored at releasePosition at t = 22.0s
    this._bakeTrajectory();

    // 3. Solve exact moving-aircraft acoustic + supersonic shockwave intercepts (~109.4s & ~111.0s at 18.5 km!)
    this.shockwave = new ShockwaveSolver(mission, (t) => this.getRawPosition(t));

    this.markers = [
      ...mission.markers,
      { time: this.shockwave.shock1Time, label: "激波 I" },
      { time: this.shockwave.shock2Time, label: "激波 II" },
    ];
  }

  _coordinatedTurnRateDps(rollDeg, tasMps) {
    // Clamp bank within structural/aerodynamic envelope so G = 1/cos(roll) <= 2.20 G
    const safeRollDeg = Math.max(-62.5, Math.min(62.5, rollDeg));
    const omegaRad = (G_ACCEL * Math.tan(safeRollDeg * DEG2RAD)) / Math.max(40.0, tasMps);
    return omegaRad * RAD2DEG;
  }

  _bakeTrajectory() {
    const relIdx = Math.round(this.mission.releaseTime / this.dt);
    const ctrlRel = sampleSchedule(this.mission.flightSchedule, this.mission.releaseTime);
    const omegaRel = this._coordinatedTurnRateDps(ctrlRel.rollDeg, ctrlRel.tasMps);
    const [wxRel, , wzRel] = sampleWindVectorMps(this.releasePosition[1], this.mission.wind);
    const hdgRelRad = this.mission.initialHeadingDeg * DEG2RAD;

    this.samples[relIdx] = {
      x: this.releasePosition[0],
      y: this.releasePosition[1],
      z: this.releasePosition[2],
      headingDeg: this.mission.initialHeadingDeg,
      turnRateDps: omegaRel,
      vxGnd: Math.sin(hdgRelRad) * ctrlRel.tasMps + wxRel,
      vzGnd: -Math.cos(hdgRelRad) * ctrlRel.tasMps + wzRel,
      windSpeedMps: Math.hypot(wxRel, wzRel),
      ...ctrlRel,
    };

    // Integrate backward 22.0s -> 0.0s
    for (let i = relIdx - 1; i >= 0; i--) {
      const t = i * this.dt;
      const next = this.samples[i + 1];
      const ctrl = sampleSchedule(this.mission.flightSchedule, t);
      const omegaDps = this._coordinatedTurnRateDps(ctrl.rollDeg, ctrl.tasMps);
      const hdg = next.headingDeg - omegaDps * this.dt;
      const rad = hdg * DEG2RAD;
      const yPrev = next.y - ctrl.climbMps * this.dt;
      const [wx, , wz] = sampleWindVectorMps(yPrev, this.mission.wind);
      const vxGnd = Math.sin(rad) * ctrl.tasMps + wx;
      const vzGnd = -Math.cos(rad) * ctrl.tasMps + wz;

      this.samples[i] = {
        x: next.x - vxGnd * this.dt,
        y: yPrev,
        z: next.z - vzGnd * this.dt,
        headingDeg: hdg,
        turnRateDps: omegaDps,
        vxGnd,
        vzGnd,
        windSpeedMps: Math.hypot(wx, wz),
        ...ctrl,
      };
    }

    // Integrate forward 22.0s -> durationSeconds
    for (let i = relIdx + 1; i < this.totalSteps; i++) {
      const t = (i - 1) * this.dt;
      const prev = this.samples[i - 1];
      const ctrl = sampleSchedule(this.mission.flightSchedule, t);
      const omegaDps = this._coordinatedTurnRateDps(ctrl.rollDeg, ctrl.tasMps);
      const hdg = prev.headingDeg + omegaDps * this.dt;
      const rad = hdg * DEG2RAD;

      // Upward wing-unloading heave when 4,400 kg Little Boy unhooks at t = 22.0s (~10 ft / 3m jump recorded by Tibbets!)
      const dtRel = t - this.mission.releaseTime;
      const unloadVy = dtRel > 0 && dtRel < 3.6 ? 2.6 * Math.exp(-dtRel * 1.05) * Math.sin(dtRel * 2.1) : 0.0;

      const yNext = prev.y + (ctrl.climbMps + unloadVy) * this.dt;
      const [wx, , wz] = sampleWindVectorMps(yNext, this.mission.wind);
      const vxGnd = Math.sin(rad) * ctrl.tasMps + wx;
      const vzGnd = -Math.cos(rad) * ctrl.tasMps + wz;

      this.samples[i] = {
        x: prev.x + vxGnd * this.dt,
        y: yNext,
        z: prev.z + vzGnd * this.dt,
        headingDeg: hdg,
        turnRateDps: omegaDps,
        vxGnd,
        vzGnd,
        windSpeedMps: Math.hypot(wx, wz),
        ...ctrl,
      };
    }
  }

  getRawPosition(t) {
    const clamped = Math.max(0, Math.min(this.mission.durationSeconds, t));
    const f = clamped / this.dt;
    const i0 = Math.min(this.totalSteps - 1, Math.floor(f));
    const i1 = Math.min(this.totalSteps - 1, i0 + 1);
    const a = f - i0;
    const s0 = this.samples[i0];
    const s1 = this.samples[i1];
    return [
      s0.x + (s1.x - s0.x) * a,
      s0.y + (s1.y - s0.y) * a,
      s0.z + (s1.z - s0.z) * a,
    ];
  }

  _computeBombBayOpenRatio(t) {
    const bb = this.mission.bombBayTiming;
    if (t <= bb.openStart || t >= bb.fullyClosed) return 0.0;
    if (t < bb.fullyOpen) return smoothstep(bb.openStart, bb.fullyOpen, t);
    if (t <= bb.closeStart) return 1.0;
    return 1.0 - smoothstep(bb.closeStart, bb.fullyClosed, t);
  }

  evaluate(t) {
    const clamped = Math.max(0, Math.min(this.mission.durationSeconds, t));
    const f = clamped / this.dt;
    const i0 = Math.min(this.totalSteps - 1, Math.floor(f));
    const i1 = Math.min(this.totalSteps - 1, i0 + 1);
    const a = f - i0;
    const s0 = this.samples[i0];
    const s1 = this.samples[i1];

    const lerp = (k) => s0[k] + (s1[k] - s0[k]) * a;
    const pos = [lerp("x"), lerp("y"), lerp("z")];
    const rawRollDeg = lerp("rollDeg");
    const rawPitchDeg = lerp("pitchDeg");
    const tasMps = lerp("tasMps");
    const rawTurnRateDps = lerp("turnRateDps");
    const headingDeg = ((lerp("headingDeg") % 360) + 360) % 360;

    // Verify exact coordinated-turn error: omega_actual - (g * tan(roll) / V_tas)
    const idealTurnRateDps = this._coordinatedTurnRateDps(rawRollDeg, tasMps);
    const coordTurnErrorDps = rawTurnRateDps - idealTurnRateDps;

    const shock = this.shockwave.evaluate(clamped, pos, headingDeg);
    const bomb = this.bomb.evaluate(clamped, pos, headingDeg);

    // Release unload jolt + subtle high-altitude turbulence + rear-aspect shockwave tail slap
    const dtRel = clamped - this.mission.releaseTime;
    const releaseJolt = dtRel >= 0 && dtRel < 2.6
      ? 0.42 * Math.exp(-dtRel * 2.1) * Math.cos(dtRel * 9.5)
      : 0.0;

    const turbRoll = 0.22 * Math.sin(clamped * 0.93) + 0.11 * Math.sin(clamped * 2.41);
    const turbPitch = 0.12 * Math.cos(clamped * 1.17) + 0.07 * Math.sin(clamped * 3.05);

    const rollDeg = rawRollDeg + turbRoll + shock.cockpitShake[0] * 36.0;
    const pitchDeg = rawPitchDeg + turbPitch + releaseJolt * 1.5 + shock.tailPitchUpDeg + shock.cockpitShake[1] * 18.0;

    const euler = new THREE.Euler(
      pitchDeg * DEG2RAD,
      -headingDeg * DEG2RAD,
      -rollDeg * DEG2RAD,
      "YXZ"
    );
    const quaternion = new THREE.Quaternion().setFromEuler(euler);

    // Structural load factor G = 1 / cos(bank) + release unload + shockwave spike (strictly <= 2.20G in maneuver!)
    const bankCos = Math.max(0.455, Math.cos(Math.abs(rawRollDeg) * DEG2RAD));
    const gLoad = Math.min(2.20, 1.0 / bankCos) + releaseJolt * 0.35 + shock.shockGSpike;

    const vxGnd = lerp("vxGnd");
    const vzGnd = lerp("vzGnd");
    const groundSpeedMps = Math.hypot(vxGnd, vzGnd);
    const groundSpeedMph = groundSpeedMps * MPS_TO_MPH;
    const windSpeedMph = lerp("windSpeedMps") * MPS_TO_MPH;
    const tasMph = tasMps * MPS_TO_MPH;
    const iasMph = tasMph * Math.sqrt(Math.exp(-pos[1] / 9200.0));
    const altitudeFt = pos[1] * 3.28084;
    const vsiFpm = lerp("climbMps") * 196.85 + shock.shockGSpike * 420.0;
    const throttle = lerp("throttle");

    // Slip ball normalized deflection [-1, +1]: centered (0.0) in coordinated turns, jolted laterally by shockwaves!
    const slipBallNorm = Math.max(
      -1.0,
      Math.min(1.0, coordTurnErrorDps * 0.15 + shock.cockpitShake[0] * 14.5 + 0.03 * Math.sin(clamped * 1.7))
    );

    // Yoke & Rudder Pedal control deflections driven by roll rate + bank hold
    const dRollRate = (s1.rollDeg - s0.rollDeg) / this.dt;
    const yokeRollRad = Math.max(-1.05, Math.min(1.05, (dRollRate * 0.028 + rawRollDeg * 0.0085)));
    const yokePitchM = -rawPitchDeg * 0.009;
    const rudderNorm = Math.max(-1.0, Math.min(1.0, dRollRate * 0.015 + rawRollDeg * 0.004));

    return {
      time: clamped,
      position: pos,
      quaternion,
      headingDeg,
      rollDeg,
      pitchDeg,
      turnRateDps: rawTurnRateDps,
      coordTurnErrorDps,
      tasMps,
      tasMph,
      groundSpeedMps,
      groundSpeedMph,
      windSpeedMph,
      iasMph,
      altitudeM: pos[1],
      altitudeFt,
      vsiFpm,
      gLoad,
      slipBallNorm,
      slantRangeKm: shock.slantRangeKm,
      bombBayOpenRatio: this._computeBombBayOpenRatio(clamped),
      throttle,
      rpm: 2150 + throttle * 480,
      manifoldInHg: 31.5 + throttle * 16.5,
      yokeRollRad,
      yokePitchM,
      rudderNorm,
      bomb,
      shock,
    };
  }
}
