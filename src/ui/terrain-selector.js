// Terrain DEM Mode Switcher ("original" | "compact" | "math")
import { TERRAIN_MODES, DEFAULT_TERRAIN_MODE, isValidTerrainMode } from "../world/terrain-modes.js";

export class TerrainSelector {
  constructor(initialMode = DEFAULT_TERRAIN_MODE, onSelect) {
    this.mode = isValidTerrainMode(initialMode) ? initialMode : DEFAULT_TERRAIN_MODE;
    this.onSelect = onSelect;
    this.rootEl = document.getElementById("terrain-bar");
    this.buttons = new Map();
    this._buildButtons();
    this.syncActive(this.mode);
  }

  _buildButtons() {
    if (!this.rootEl) return;
    this.rootEl.innerHTML = "";
    for (const item of TERRAIN_MODES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "station-btn";
      btn.dataset.terrain = item.id;
      btn.textContent = item.shortLabel;
      btn.title = item.label;
      btn.addEventListener("click", () => {
        if (this.mode !== item.id) {
          this.onSelect?.(item.id);
        }
      });
      this.rootEl.appendChild(btn);
      this.buttons.set(item.id, btn);
    }
  }

  syncActive(modeId) {
    this.mode = modeId;
    for (const [id, btn] of this.buttons) {
      btn.classList.toggle("is-active", id === modeId);
    }
    document.documentElement.dataset.terrainMode = modeId;
  }
}
