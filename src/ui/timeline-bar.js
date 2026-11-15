function formatMmSs(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export class TimelineBar {
  constructor(durationSeconds, markers, callbacks) {
    this.duration = durationSeconds;
    this.cb = callbacks;

    this.briefing = document.getElementById("briefing-screen");
    this.btnStart = document.getElementById("btn-start");
    this.btnStartText = document.getElementById("btn-start-text");

    this.btnPlay = document.getElementById("btn-play");
    this.btnReplay = document.getElementById("btn-replay");
    this.btnMute = document.getElementById("btn-mute");
    this.btnQuality = document.getElementById("btn-quality");
    this.slider = document.getElementById("timeline-slider");
    this.timeReadout = document.getElementById("time-readout");
    this.markersRoot = document.getElementById("scrubber-markers");

    this.slider.max = String(durationSeconds);
    this._renderMarkers(markers);
    this._bindEvents();
  }

  _renderMarkers(markers) {
    this.markersRoot.innerHTML = "";
    const sorted = [...markers].sort((a, b) => a.time - b.time);

    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i];
      const prev = sorted[i - 1];
      const next = sorted[i + 1];
      const closeNext = next && (next.time - m.time) / this.duration < 0.085;
      const closePrev = prev && (m.time - prev.time) / this.duration < 0.085;

      const tick = document.createElement("div");
      tick.className = "scrubber-tick";
      if (closeNext && !closePrev) {
        tick.classList.add("is-pair-left");
      } else if (closePrev) {
        tick.classList.add("is-pair-right");
      }
      tick.style.left = `${(m.time / this.duration) * 100}%`;
      tick.dataset.label = m.label;
      tick.title = `${m.label} (${formatMmSs(m.time)})`;
      this.markersRoot.appendChild(tick);
    }
  }

  _bindEvents() {
    this.btnStart.addEventListener("click", () => {
      this.hideBriefing();
      this.cb.onStart?.();
    });

    this.btnPlay.addEventListener("click", () => this.cb.onTogglePlay?.());
    this.btnReplay.addEventListener("click", () => this.cb.onReplay?.());

    this.slider.addEventListener("input", () => {
      this.cb.onSeek?.(parseFloat(this.slider.value));
    });

    this.btnMute.addEventListener("click", () => {
      const muted = this.cb.onToggleMute?.();
      this.btnMute.textContent = muted ? "声音: 关" : "声音: 开";
    });

    this.btnQuality.addEventListener("click", () => {
      const label = this.cb.onCycleQuality?.();
      this.btnQuality.textContent = `画质: ${label}`;
    });

    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (!this.briefing.classList.contains("is-hidden")) {
          this.hideBriefing();
          this.cb.onStart?.();
        } else {
          this.cb.onTogglePlay?.();
        }
      } else if (e.code === "KeyR") {
        this.cb.onReplay?.();
      } else if (e.code === "KeyM") {
        const muted = this.cb.onToggleMute?.();
        this.btnMute.textContent = muted ? "声音: 关" : "声音: 开";
      }
    });
  }

  markReady() {
    this.btnStart.disabled = false;
    this.btnStartText.textContent = "进入历史多工位座舱 · 开始模拟";
  }

  hideBriefing(immediate = false) {
    if (immediate) {
      this.briefing.style.transition = "none";
      this.briefing.hidden = true;
    }
    this.briefing.classList.add("is-hidden");
  }

  sync(time, playing) {
    if (document.activeElement !== this.slider) {
      this.slider.value = time.toFixed(2);
    }
    this.timeReadout.textContent = `${formatMmSs(time)} / ${formatMmSs(this.duration)}`;
    this.btnPlay.textContent = playing ? "暂停" : "播放";
  }
}
