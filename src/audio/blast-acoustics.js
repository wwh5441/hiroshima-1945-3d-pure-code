// Speed-of-Sound Delayed Dual Acoustic Shockwave Synthesizer + Master tanh() Limiter
// Dead acoustic silence at t = 66.4s flash -> Violent double N-wave impact ~40s later!

function makeTanhCurve(samples = 2048) {
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1;
    curve[i] = Math.tanh(x * 1.85) / Math.tanh(1.85);
  }
  return curve;
}

export class BlastAcousticsSynth {
  constructor(ctx, shock1Time, shock2Time) {
    this.ctx = ctx;
    this.shock1Time = shock1Time;
    this.shock2Time = shock2Time;
    this.lastTime = -1;

    // Master bus with tanh() soft-clipping waveshaper (prevents any digital clipping on shockwave hits!)
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.85;

    this.softClipper = ctx.createWaveShaper();
    this.softClipper.curve = makeTanhCurve();
    this.softClipper.oversample = "2x";

    this.outGain = ctx.createGain();
    this.outGain.gain.value = 1.0;

    this.masterGain.connect(this.softClipper);
    this.softClipper.connect(this.outGain);
    this.outGain.connect(ctx.destination);

    // Pre-generate burst noise buffer for N-wave shock crack + stratospheric rumble
    const len = ctx.sampleRate * 5;
    this.rumbleBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.rumbleBuf.getChannelData(0);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      lp = 0.92 * lp + 0.08 * w;
      data[i] = lp * 2.4 + w * 0.25;
    }
  }

  _fireShockwaveBoom(strength) {
    const now = this.ctx.currentTime;

    // 1. Sharp N-wave overpressure crack ("Flak!" hull slap)
    const punch = this.ctx.createOscillator();
    const punchGain = this.ctx.createGain();
    punch.type = "sine";
    punch.frequency.setValueAtTime(98 * strength, now);
    punch.frequency.exponentialRampToValueAtTime(24, now + 0.55);
    punchGain.gain.setValueAtTime(0.95 * strength, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    punch.connect(punchGain);
    punchGain.connect(this.masterGain);
    punch.start(now);
    punch.stop(now + 0.8);

    // 2. Trailing deep tropospheric thunder & airframe aluminum groan
    const src = this.ctx.createBufferSource();
    src.buffer = this.rumbleBuf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(340, now);
    filt.frequency.exponentialRampToValueAtTime(68, now + 4.2);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.01, now);
    g.gain.linearRampToValueAtTime(0.82 * strength, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.002, now + 4.6);

    src.connect(filt);
    filt.connect(g);
    g.connect(this.masterGain);
    src.start(now);
    src.stop(now + 4.8);
  }

  update(flightState, playing) {
    const t = flightState.time;
    if (playing && this.lastTime >= 0 && Math.abs(t - this.lastTime) < 1.0) {
      if (this.lastTime < this.shock1Time && t >= this.shock1Time) {
        this._fireShockwaveBoom(1.0);
      }
      if (this.lastTime < this.shock2Time && t >= this.shock2Time) {
        this._fireShockwaveBoom(0.78);
      }
    }
    this.lastTime = t;
  }
}
