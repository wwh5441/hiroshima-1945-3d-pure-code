// Deterministic 30 FPS Cinema Frame Pacer & Mission Clock

export class CinemaClock {
  constructor(durationSeconds, targetFps = 30) {
    this.duration = durationSeconds;
    this.targetFps = targetFps;
    this.frameIntervalMs = 1000.0 / targetFps;

    this.time = 0.0;
    this.playing = false;
    this.dirty = true;
    this.lastRafMs = performance.now();
    this.accumMs = 0.0;

    this.fpsCounter = targetFps;
    this._frames = 0;
    this._fpsMarkMs = performance.now();
  }

  play() {
    this.playing = true;
    this.lastRafMs = performance.now();
    this.dirty = true;
  }

  pause() {
    this.playing = false;
    this.dirty = true;
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
    return this.playing;
  }

  seek(t) {
    this.time = Math.max(0, Math.min(this.duration, t));
    this.dirty = true;
  }

  restart() {
    this.time = 0.0;
    this.dirty = true;
  }

  // Returns { shouldRender, dt } capped cleanly at target 30 FPS cadence
  tick(nowMs) {
    const rawDeltaMs = Math.min(120.0, Math.max(0.0, nowMs - this.lastRafMs));
    this.lastRafMs = nowMs;
    this.accumMs += rawDeltaMs;

    // Allow slight 1.5ms slack for 60Hz/120Hz VSync alignment so 30 FPS never drops to 20 FPS!
    if (this.accumMs < this.frameIntervalMs - 1.5 && !this.dirty) {
      return { shouldRender: false, dt: 0 };
    }

    const stepSec = Math.min(0.066, this.accumMs / 1000.0);
    this.accumMs = this.accumMs % this.frameIntervalMs;
    this.dirty = false;

    if (this.playing) {
      this.time = Math.min(this.duration, this.time + stepSec);
      if (this.time >= this.duration) {
        this.playing = false;
      }
    }

    this._frames++;
    if (nowMs - this._fpsMarkMs >= 1000.0) {
      this.fpsCounter = Math.round((this._frames * 1000.0) / (nowMs - this._fpsMarkMs));
      this._frames = 0;
      this._fpsMarkMs = nowMs;
    }

    return { shouldRender: true, dt: stepSec || 1 / this.targetFps };
  }
}
