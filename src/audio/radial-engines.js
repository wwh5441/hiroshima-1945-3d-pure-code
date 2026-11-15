// 4x Wright R-3350 18-Cylinder Duplex-Cyclone Radial Engine Synthesizer
// Slightly detuned engine pairs create authentic WWII heavy-bomber low-frequency beating throb

export class RadialEnginesSynth {
  constructor(ctx, destination) {
    this.ctx = ctx;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.28;

    // Warm cabin fuselage lowpass muffling
    this.cabinFilter = ctx.createBiquadFilter();
    this.cabinFilter.type = "lowpass";
    this.cabinFilter.frequency.value = 260;
    this.cabinFilter.Q.value = 1.4;

    this.bus.connect(this.cabinFilter);
    this.cabinFilter.connect(destination);

    // 4 engines with realistic slight RPM offsets for acoustic beating
    const detunes = [-1.4, -0.35, +0.55, +1.65];
    this.engines = detunes.map((det) => {
      const fundamental = ctx.createOscillator();
      fundamental.type = "sawtooth";
      fundamental.frequency.value = 54 + det;

      const sub = ctx.createOscillator();
      sub.type = "triangle";
      sub.frequency.value = (54 + det) * 0.5;

      const gFund = ctx.createGain();
      gFund.gain.value = 0.16;
      const gSub = ctx.createGain();
      gSub.gain.value = 0.24;

      fundamental.connect(gFund);
      sub.connect(gSub);
      gFund.connect(this.bus);
      gSub.connect(this.bus);

      fundamental.start();
      sub.start();
      return { fundamental, sub, det };
    });

    // General Electric BH-4 turbo-supercharger high-altitude whistle
    this.turboOsc = ctx.createOscillator();
    this.turboOsc.type = "sine";
    this.turboOsc.frequency.value = 1180;
    this.turboGain = ctx.createGain();
    this.turboGain.gain.value = 0.012;
    this.turboOsc.connect(this.turboGain);
    this.turboGain.connect(destination);
    this.turboOsc.start();
  }

  update(flightState) {
    const now = this.ctx.currentTime;
    const baseHz = (flightState.rpm / 60.0) * 1.5; // Cylinder firing harmonic
    for (const e of this.engines) {
      e.fundamental.frequency.setTargetAtTime(baseHz + e.det, now, 0.08);
      e.sub.frequency.setTargetAtTime((baseHz + e.det) * 0.5, now, 0.08);
    }
    this.cabinFilter.frequency.setTargetAtTime(210 + flightState.throttle * 135, now, 0.1);
    this.bus.gain.setTargetAtTime(0.20 + flightState.throttle * 0.12, now, 0.1);
    this.turboOsc.frequency.setTargetAtTime(1040 + flightState.throttle * 420, now, 0.12);
  }
}
