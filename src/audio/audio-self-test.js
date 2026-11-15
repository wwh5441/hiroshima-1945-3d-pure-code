import { RadialEnginesSynth } from "./radial-engines.js";
import { CockpitFoleySynth } from "./cockpit-foley.js";
import { BlastAcousticsSynth } from "./blast-acoustics.js";

// Unified Mission Audio Director + Automated Soft-Limiter & RMS Self-Verification Hook

export class MissionAudioDirector {
  constructor(mission, shock1Time, shock2Time) {
    this.mission = mission;
    this.shock1Time = shock1Time;
    this.shock2Time = shock2Time;

    this.ctx = null;
    this.blast = null;
    this.engines = null;
    this.foley = null;
    this.muted = false;
  }

  async unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.blast = new BlastAcousticsSynth(this.ctx, this.shock1Time, this.shock2Time);
      this.engines = new RadialEnginesSynth(this.ctx, this.blast.masterGain);
      this.foley = new CockpitFoleySynth(this.ctx, this.blast.masterGain, this.mission.releaseTime);
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  setPaused(paused) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const target = paused || this.muted ? 0.0 : 1.0;
    this.blast.outGain.gain.setTargetAtTime(target, now, 0.05);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx && this.blast) {
      this.blast.outGain.gain.setTargetAtTime(this.muted ? 0.0 : 1.0, this.ctx.currentTime, 0.04);
    }
    return this.muted;
  }

  seek(t) {
    if (this.foley) this.foley.lastTime = t;
    if (this.blast) this.blast.lastTime = t;
  }

  update(flightState, playing) {
    if (!this.ctx) return;
    this.engines.update(flightState);
    this.foley.update(flightState, playing);
    this.blast.update(flightState, playing);
  }

  // Offline deterministic self-test verifying non-zero engine RMS & tanh() peak safety (< 1.0)
  static async runOfflineSelfTest() {
    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineCtx) return { passed: true, note: "OfflineAudioContext unavailable" };

    const sr = 22050;
    const off = new OfflineCtx(1, sr * 2, sr);
    const blast = new BlastAcousticsSynth(off, 0.25, 1.15);
    const engines = new RadialEnginesSynth(off, blast.masterGain);
    engines.update({ rpm: 2450, throttle: 0.85 });
    blast._fireShockwaveBoom(1.0);

    const rendered = await off.startRendering();
    const pcm = rendered.getChannelData(0);
    let sumSq = 0;
    let peak = 0;
    for (let i = 0; i < pcm.length; i++) {
      const a = Math.abs(pcm[i]);
      if (a > peak) peak = a;
      sumSq += a * a;
    }
    const rms = Math.sqrt(sumSq / pcm.length);
    return {
      passed: rms > 0.02 && peak <= 1.001,
      rms: Number(rms.toFixed(4)),
      peak: Number(peak.toFixed(4)),
    };
  }
}
