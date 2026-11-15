function pad2(n) {
  return String(Math.floor(n)).padStart(2, "0");
}

export class HudController {
  constructor(mission, shock1Time, shock2Time) {
    this.mission = mission;
    this.shock1Time = shock1Time;
    this.shock2Time = shock2Time ?? shock1Time + 1.6;

    this.elClock = document.getElementById("hud-clock");
    this.elAlt = document.getElementById("hud-alt");
    this.elTas = document.getElementById("hud-tas");
    this.elGs = document.getElementById("hud-gs");
    this.elHdg = document.getElementById("hud-hdg");
    this.elG = document.getElementById("hud-g");
    this.elRangeBox = document.getElementById("hud-range-box");
    this.elRangeVal = document.getElementById("hud-range-val");
    this.elWaveBox = document.getElementById("hud-wave-box");
    this.elWaveLabel = document.getElementById("hud-wave-label");
    this.elWaveVal = document.getElementById("hud-wave-val");
    this.elActTitle = document.getElementById("hud-act-title");
    this.elCaption = document.getElementById("hud-caption");
  }

  update(flightState) {
    const t = flightState.time;
    const [bh, bm, bs] = this.mission.baseClockHms;
    const totalSec = bh * 3600 + bm * 60 + bs + t;
    const hh = Math.floor(totalSec / 3600) % 24;
    const mm = Math.floor(totalSec / 60) % 60;
    const ss = Math.floor(totalSec) % 60;
    this.elClock.textContent = `${pad2(hh)}:${pad2(mm)}:${pad2(ss)} JST`;

    this.elAlt.textContent = `${Math.round(flightState.altitudeFt).toLocaleString("en-US")} FT`;
    this.elTas.textContent = `${Math.round(flightState.tasMph)} MPH`;
    if (this.elGs) {
      this.elGs.textContent = `${Math.round(flightState.groundSpeedMph)} MPH`;
    }
    this.elHdg.textContent = `${String(Math.round(flightState.headingDeg)).padStart(3, "0")}°`;
    this.elG.textContent = `${flightState.gLoad.toFixed(1)} G`;

    if (this.elRangeBox && this.elRangeVal) {
      if (t >= this.mission.releaseTime) {
        this.elRangeBox.hidden = false;
        this.elRangeVal.textContent = `${flightState.slantRangeKm.toFixed(1)} KM`;
      } else {
        this.elRangeBox.hidden = true;
      }
    }

    // Strictly hide before bomb release (t < releaseTime) and after second shockwave passes!
    if (t >= this.mission.releaseTime && t < this.mission.detonationTime) {
      this.elWaveBox.hidden = false;
      this.elWaveLabel.textContent = "BOMB FALL";
      this.elWaveVal.textContent = `${Math.max(0, this.mission.detonationTime - t).toFixed(1)} S`;
    } else if (t >= this.mission.detonationTime && t < this.shock1Time) {
      this.elWaveBox.hidden = false;
      this.elWaveLabel.textContent = "SHOCK 1 ETA";
      this.elWaveVal.textContent = `${Math.max(0, this.shock1Time - t).toFixed(1)} S`;
    } else if (t >= this.shock1Time && t < this.shock2Time) {
      this.elWaveBox.hidden = false;
      this.elWaveLabel.textContent = "SHOCK 2 ETA";
      this.elWaveVal.textContent = `${Math.max(0, this.shock2Time - t).toFixed(1)} S`;
    } else {
      this.elWaveBox.hidden = true;
    }

    let activeAct = null;
    for (const act of this.mission.acts) {
      if (t >= act.start && t <= act.end) {
        activeAct = act;
        break;
      }
    }
    if (activeAct) {
      this.elActTitle.textContent = activeAct.title;
      this.elCaption.textContent = activeAct.caption;
    }
  }
}
