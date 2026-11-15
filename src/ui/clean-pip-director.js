import { buildMontageSchedule, PIP_SLOTS_16_9 } from "../../data/montage-pip-spec.js";

function pad2(n) {
  return String(Math.floor(n)).padStart(2, "0");
}

// Clean-Feed Multi-Angle + Picture-in-Picture (PiP) Director & Deterministic 1080p Frame Compositor
export class CleanPipDirector {
  constructor(mission, shock1Time, shock2Time) {
    this.mission = mission;
    this.shock1Time = shock1Time;
    this.shock2Time = shock2Time ?? shock1Time + 1.6;
    this.schedule = buildMontageSchedule(shock1Time);

    this.pipLayer = document.createElement("div");
    this.pipLayer.className = "pip-overlay-layer";
    this.pipLayer.hidden = true;
    document.getElementById("app-shell")?.appendChild(this.pipLayer);

    this.pipBoxes = [document.createElement("div"), document.createElement("div")];
    for (const b of this.pipBoxes) {
      b.className = "pip-frame-box";
      b.hidden = true;
      this.pipLayer.appendChild(b);
    }

    this._compCanvas = null;
    this._compCtx = null;
  }

  setCleanMode(enabled) {
    document.body.classList.toggle("is-clean-feed", Boolean(enabled));
  }

  // Evaluate exact 60.0s multi-angle + PiP state at video time vidT [0..60]
  evaluateMontage(vidT) {
    const clamped = Math.max(0, Math.min(60.0, vidT));
    let seg = this.schedule[this.schedule.length - 1];
    let segIdx = this.schedule.length - 1;
    for (let i = 0; i < this.schedule.length; i++) {
      if (clamped >= this.schedule[i].vidStart && clamped < this.schedule[i].vidEnd) {
        seg = this.schedule[i];
        segIdx = i;
        break;
      }
    }
    const u = (clamped - seg.vidStart) / Math.max(1e-5, seg.vidEnd - seg.vidStart);
    const simTime = seg.simStart + u * (seg.simEnd - seg.simStart);
    return {
      segIdx,
      simTime,
      mainStation: seg.main,
      pips: seg.pips,
    };
  }

  // Compute CSS & WebGL viewport rectangles for 1 or 2 PiP windows
  resolvePipRects(pips, cssW, cssH) {
    if (!pips || pips.length === 0) return [];
    const isDual = pips.length >= 2;
    return pips.map((p) => {
      const spec = isDual
        ? p.slot === "bl"
          ? PIP_SLOTS_16_9.dual_bl
          : PIP_SLOTS_16_9.dual_br
        : PIP_SLOTS_16_9.single_br;
      const w = Math.round(cssW * spec.widthFrac);
      const h = Math.round(cssH * spec.heightFrac);
      const left = Math.round(cssW * spec.leftFrac);
      const top = Math.round(cssH * spec.topFrac);
      // WebGL viewport Y is measured from bottom edge!
      const glY = Math.round(cssH - top - h);
      return {
        station: p.station,
        reticle: Boolean(p.reticle),
        css: { left, top, w, h },
        gl: { x: left, y: glY, w, h },
      };
    });
  }

  // Sync live HTML hairline borders around active PiP viewports
  updateLiveOverlay(pipRects) {
    if (!pipRects || pipRects.length === 0) {
      this.pipLayer.hidden = true;
      return;
    }
    this.pipLayer.hidden = false;
    for (let i = 0; i < this.pipBoxes.length; i++) {
      const box = this.pipBoxes[i];
      const r = pipRects[i];
      if (!r) {
        box.hidden = true;
        continue;
      }
      box.hidden = false;
      box.style.left = `${r.css.left}px`;
      box.style.top = `${r.css.top}px`;
      box.style.width = `${r.css.w}px`;
      box.style.height = `${r.css.h}px`;
    }
  }

  // Composite WebGL2 canvas + crisp PiP hairlines + Norden optical reticle + minimal top-left numeric telemetry (ZERO explanatory captions!)
  compositeCleanFrame(webglCanvas, flightState, mainStation, pipRects, vidTime = -1) {
    const W = webglCanvas.width;
    const H = webglCanvas.height;
    if (!this._compCanvas || this._compCanvas.width !== W || this._compCanvas.height !== H) {
      this._compCanvas = document.createElement("canvas");
      this._compCanvas.width = W;
      this._compCanvas.height = H;
      this._compCtx = this._compCanvas.getContext("2d", { alpha: false });
    }
    const ctx = this._compCtx;
    const scale = W / 1920;

    // 1. Blit HDR-tonemapped WebGL2 Main + PiP framebuffer
    ctx.drawImage(webglCanvas, 0, 0, W, H);

    // 2. If Main view is Bombardier during Bomb Run, draw clean optical crosshair (no text!)
    if (mainStation === "bombardier" && flightState.time < this.mission.releaseTime + 2.2) {
      this._drawOpticalCrosshair(ctx, W * 0.5, H * 0.5, Math.min(W, H) * 0.24, scale);
    }

    // 3. Draw crisp hairline borders around PiP viewports (+ miniature optical crosshair if Bombardier PiP)
    for (const r of pipRects) {
      const x = r.css.left * (W / Math.max(1, webglCanvas.clientWidth || W));
      const y = r.css.top * (H / Math.max(1, webglCanvas.clientHeight || H));
      const rw = r.css.w * (W / Math.max(1, webglCanvas.clientWidth || W));
      const rh = r.css.h * (H / Math.max(1, webglCanvas.clientHeight || H));

      if (r.reticle && flightState.time < this.mission.releaseTime + 2.2) {
        this._drawOpticalCrosshair(ctx, x + rw * 0.5, y + rh * 0.5, rh * 0.34, scale * 0.85);
      }

      ctx.save();
      ctx.strokeStyle = "rgba(4, 7, 12, 0.88)";
      ctx.lineWidth = 4.0 * scale;
      ctx.strokeRect(x, y, rw, rh);

      ctx.strokeStyle = "rgba(226, 234, 242, 0.68)";
      ctx.lineWidth = 1.6 * scale;
      ctx.strokeRect(x, y, rw, rh);
      ctx.restore();
    }

    // 4. Draw Minimal Top-Left Numeric Telemetry Strip (Time, Alt, TAS, GS, HDG, G-Load, Slant/Countdown — ZERO Chinese captions!)
    this._drawMinimalTopLeftTelemetry(ctx, flightState, scale);

    // 5. Smooth cinema fade-in (first 0.6s) & fade-out (final 1.1s) during 60s video export
    if (vidTime >= 0) {
      let fadeAlpha = 0.0;
      if (vidTime < 0.6) {
        fadeAlpha = 1.0 - vidTime / 0.6;
      } else if (vidTime > 58.9) {
        fadeAlpha = Math.min(1.0, (vidTime - 58.9) / 1.1);
      }
      if (fadeAlpha > 0.002) {
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha.toFixed(4)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    return this._compCanvas;
  }

  _drawOpticalCrosshair(ctx, cx, cy, rad, scale) {
    ctx.save();
    ctx.strokeStyle = "rgba(235, 196, 128, 0.56)";
    ctx.lineWidth = 1.4 * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - rad * 0.88, cy);
    ctx.lineTo(cx + rad * 0.88, cy);
    ctx.moveTo(cx, cy - rad * 0.88);
    ctx.lineTo(cx, cy + rad * 0.88);
    ctx.stroke();
    ctx.restore();
  }

  _drawMinimalTopLeftTelemetry(ctx, flightState, scale) {
    const t = flightState.time;
    const [bh, bm, bs] = this.mission.baseClockHms;
    const totalSec = bh * 3600 + bm * 60 + bs + t;
    const hh = Math.floor(totalSec / 3600) % 24;
    const mm = Math.floor(totalSec / 60) % 60;
    const ss = Math.floor(totalSec) % 60;

    const items = [
      { label: "JST", val: `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`, accent: "radium" },
      { label: "ALT", val: `${Math.round(flightState.altitudeFt).toLocaleString("en-US")} FT` },
      { label: "TAS", val: `${Math.round(flightState.tasMph)} MPH` },
      { label: "GS", val: `${Math.round(flightState.groundSpeedMph)} MPH` },
      { label: "HDG", val: `${String(Math.round(flightState.headingDeg)).padStart(3, "0")}°` },
      { label: "LOAD", val: `${flightState.gLoad.toFixed(1)} G` },
    ];

    if (t >= this.mission.releaseTime) {
      items.push({ label: "SLANT", val: `${flightState.slantRangeKm.toFixed(1)} KM` });
    }
    if (t >= this.mission.releaseTime && t < this.mission.detonationTime) {
      items.push({
        label: "T-BURST",
        val: `${Math.max(0, this.mission.detonationTime - t).toFixed(1)} S`,
        accent: "amber",
      });
    } else if (t >= this.mission.detonationTime && t < this.shock1Time) {
      items.push({
        label: "SHOCK 1",
        val: `${Math.max(0, this.shock1Time - t).toFixed(1)} S`,
        accent: "amber",
      });
    } else if (t >= this.shock1Time && t < this.shock2Time) {
      items.push({
        label: "SHOCK 2",
        val: `${Math.max(0, this.shock2Time - t).toFixed(1)} S`,
        accent: "amber",
      });
    }

    ctx.save();
    let curX = 26 * scale;
    const topY = 22 * scale;
    const boxH = 44 * scale;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      ctx.font = `600 ${Math.round(15 * scale)}px "SF Mono", "Menlo", "Consolas", monospace`;
      const textW = ctx.measureText(it.val).width;
      const boxW = Math.max(76 * scale, textW + 24 * scale);

      ctx.fillStyle = "rgba(8, 12, 18, 0.64)";
      ctx.fillRect(curX, topY, boxW, boxH);

      ctx.strokeStyle =
        it.accent === "amber" ? "rgba(235, 182, 101, 0.55)" : "rgba(226, 234, 242, 0.16)";
      ctx.lineWidth = 1.0 * scale;
      ctx.strokeRect(curX, topY, boxW, boxH);

      if (i === 0) {
        ctx.fillStyle = "rgba(235, 182, 101, 0.9)";
        ctx.fillRect(curX, topY, 2.5 * scale, boxH);
      }

      ctx.font = `500 ${Math.round(9.5 * scale)}px "SF Mono", "Menlo", "Consolas", monospace`;
      ctx.fillStyle = "rgba(176, 188, 202, 0.78)";
      ctx.fillText(it.label, curX + 10 * scale, topY + 15 * scale);

      ctx.font = `600 ${Math.round(14.5 * scale)}px "SF Mono", "Menlo", "Consolas", monospace`;
      ctx.fillStyle =
        it.accent === "radium"
          ? "#cde8b5"
          : it.accent === "amber"
          ? "#ebb665"
          : "#eef3f8";
      ctx.fillText(it.val, curX + 10 * scale, topY + 34 * scale);

      curX += boxW + 7 * scale;
    }
    ctx.restore();
  }
}
