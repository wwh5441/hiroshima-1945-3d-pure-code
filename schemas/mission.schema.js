export function validateMissionConfig(cfg, geo) {
  const errors = [];
  if (!cfg || typeof cfg !== "object") {
    throw new Error("Mission configuration missing");
  }
  if (!(cfg.durationSeconds >= 120 && cfg.durationSeconds <= 200)) {
    errors.push("durationSeconds must be 1:1 physical duration (120..200s)");
  }
  if (Math.abs(cfg.releaseAltitudeM - 9467) > 50) {
    errors.push("releaseAltitudeM must match historical 31,060 ft (~9,467m)");
  }
  if (Math.abs(cfg.detonationTime - cfg.releaseTime - 44.4) > 0.5) {
    errors.push("Free-fall duration must match 1:1 physical 44.4s fall");
  }
  if (!cfg.wind || !(cfg.wind.speedAtReleaseMps > 15 && cfg.wind.speedAtReleaseMps < 25)) {
    errors.push("Mission wind vector must specify authentic 31,060-ft headwind (~43 mph)");
  }
  if (!cfg.bombSpec || cfg.bombSpec.massKg !== 4400) {
    errors.push("bombSpec must specify 4,400 kg Mk-1 Little Boy physical parameters");
  }
  if (!Array.isArray(cfg.flightSchedule) || cfg.flightSchedule.some((s) => "turnRateDps" in s)) {
    errors.push("flightSchedule must be strictly bank-driven (no hardcoded turnRateDps)");
  }
  if (!Array.isArray(cfg.stations) || cfg.stations.length < 4) {
    errors.push("Mission requires all 4 historical camera stations");
  }
  if (!geo || !Array.isArray(geo.rivers) || geo.rivers.length !== 7) {
    errors.push("HIROSHIMA_GEO must provide all 7 Ota River delta branches");
  } else {
    const aimOffset = Math.hypot(
      geo.aimingPoint.x - geo.hypocenter.x,
      geo.aimingPoint.z - geo.hypocenter.z
    );
    if (aimOffset < 180 || aimOffset > 320) {
      errors.push("Aioi Bridge aimingPoint must be ~240m NW of Shima Hospital hypocenter");
    }
  }
  if (errors.length > 0) {
    throw new Error("Invalid Mission/Geo Schema: " + errors.join("; "));
  }
  return true;
}
