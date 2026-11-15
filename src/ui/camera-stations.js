// Multi-Station Historical Crew & Escort Camera Switcher
// Supports Auto-Director ("auto", key 0) + 4 Manual Crew/Escort Locks (keys 1, 2, 3, 4)
// Driven 100% by MISSION_1945.stations & MISSION_1945.autoDirectorSchedule.

export class CameraStationController {
  constructor(mission, onChange) {
    this.mission = mission;
    this.onChange = onChange;
    this.mode = "auto"; // "auto" | "captain" | "bombardier" | "tail_gunner" | "escort"

    this.stationMap = new Map();
    for (const s of mission.stations) {
      this.stationMap.set(s.id, s);
      this.stationMap.set(s.key, s);
    }

    this.rootEl = document.getElementById("station-bar");
    this.nordenOverlayEl = document.getElementById("norden-reticle");
    this.stationBadgeEl = document.getElementById("hud-station-title");
    this.buttons = new Map();

    this._buildButtons();
    this._bindKeys();
  }

  _buildButtons() {
    if (!this.rootEl) return;
    this.rootEl.innerHTML = "";

    const items = [
      { id: "auto", label: "自动·0", title: "全自动历史导演切镜 (按键 0)" },
      ...this.mission.stations.map((s) => ({
        id: s.id,
        label: s.shortLabel,
        title: `${s.title} (按键 ${s.key})`,
      })),
    ];

    for (const item of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "station-btn";
      btn.dataset.station = item.id;
      btn.textContent = item.label;
      btn.title = item.title;
      btn.addEventListener("click", () => this.setMode(item.id));
      this.rootEl.appendChild(btn);
      this.buttons.set(item.id, btn);
    }
    this._syncActivePill("captain");
  }

  _bindKeys() {
    window.addEventListener("keydown", (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (e.key === "0" || e.code === "Digit0") {
        this.setMode("auto");
      } else if (e.key === "1" || e.code === "Digit1") {
        this.setMode("captain");
      } else if (e.key === "2" || e.code === "Digit2") {
        this.setMode("bombardier");
      } else if (e.key === "3" || e.code === "Digit3") {
        this.setMode("tail_gunner");
      } else if (e.key === "4" || e.code === "Digit4") {
        this.setMode("escort");
      }
    });
  }

  setMode(modeOrKey) {
    const key = String(modeOrKey).trim().toLowerCase();
    if (key === "auto" || key === "0") {
      this.mode = "auto";
    } else if (this.stationMap.has(key)) {
      this.mode = this.stationMap.get(key).id;
    } else {
      throw new Error(`Unknown camera station: ${modeOrKey}`);
    }
    this.onChange?.(this.mode);
  }

  resolveStation(t) {
    if (this.mode !== "auto") {
      return this.mode;
    }
    for (const seg of this.mission.autoDirectorSchedule) {
      if (t >= seg.start && t <= seg.end) {
        return seg.station;
      }
    }
    return "captain";
  }

  _syncActivePill(resolvedStationId) {
    for (const [id, btn] of this.buttons.entries()) {
      const isSelected = this.mode === id;
      const isAutoTarget = this.mode === "auto" && id === resolvedStationId;
      btn.classList.toggle("is-active", isSelected);
      btn.classList.toggle("is-auto-current", isAutoTarget);
    }
  }

  updateUi(t, resolvedStationId) {
    this._syncActivePill(resolvedStationId);
    const meta = this.stationMap.get(resolvedStationId);
    if (this.stationBadgeEl && meta) {
      this.stationBadgeEl.textContent =
        this.mode === "auto" ? `AUTO · ${meta.title}` : meta.title;
    }
    if (this.nordenOverlayEl) {
      // Show subtle Norden M-9 optical bombsight crosshair reticle when viewing through Bombardier optics!
      const showNorden = resolvedStationId === "bombardier" && t < this.mission.releaseTime + 4.0;
      this.nordenOverlayEl.hidden = !showNorden;
    }
  }
}
