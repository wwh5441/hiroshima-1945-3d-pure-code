// Pressurized Stratospheric Slipstream, Norden 400Hz Gyro, Bomb Release Radio Tone & Shackle Clunk

export class CockpitFoleySynth {
  constructor(ctx, destination, releaseTime) {
    this.ctx = ctx;
    this.destination = destination;
    this.releaseTime = releaseTime;
    this.lastTime = -1;

    // 31,060-ft pressurized slipstream pink/filtered wind noise
    const bufLen = ctx.sampleRate * 2;
    const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufLen; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.029;
      b1 = 0.985 * b1 + w * 0.032;
      b2 = 0.950 * b2 + w * 0.048;
      ch[i] = (b0 + b1 + b2) * 0.35;
    }

    this.windSrc = ctx.createBufferSource();
    this.windSrc.buffer = noiseBuf;
    this.windSrc.loop = true;

    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.frequency.value = 480;
    this.windFilter.Q.value = 0.8;

    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.09;

    this.windSrc.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(destination);
    this.windSrc.start();

    // Continuous 400Hz AC avionics / Norden M-9 gyro hum + bomb-run radio tone
    this.toneOsc = ctx.createOscillator();
    this.toneOsc.type = "sine";
    this.toneOsc.frequency.value = 880;
    this.toneGain = ctx.createGain();
    this.toneGain.gain.value = 0.0;
    this.toneOsc.connect(this.toneGain);
    this.toneGain.connect(destination);
    this.toneOsc.start();
  }

  _triggerShackleRelease() {
    const now = this.ctx.currentTime;
    // Heavy mechanical pneumatic bomb-shackle clunk
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.24);
    g.gain.setValueAtTime(0.42, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(g);
    g.connect(this.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  update(flightState, playing) {
    const t = flightState.time;
    const now = this.ctx.currentTime;

    // Slipstream wind rises with True Airspeed during 60° diving breakaway
    const speedFactor = (flightState.tasMps - 140) / 30;
    this.windFilter.frequency.setTargetAtTime(440 + speedFactor * 260, now, 0.1);
    this.windGain.gain.setTargetAtTime(0.075 + Math.max(0, speedFactor) * 0.065, now, 0.1);

    // Authentic continuous Norden radio bomb-release tone during final 12 seconds before drop,
    // cutting off sharply at exact t = 22.0s release (historical Enola Gay radio signal!)
    const inToneWindow = playing && t >= this.releaseTime - 12.0 && t < this.releaseTime;
    this.toneGain.gain.setTargetAtTime(inToneWindow ? 0.032 : 0.0, now, 0.03);

    if (playing && this.lastTime >= 0 && this.lastTime < this.releaseTime && t >= this.releaseTime) {
      this._triggerShackleRelease();
    }
    this.lastTime = t;
  }
}
