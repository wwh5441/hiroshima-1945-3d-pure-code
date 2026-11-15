// 60.0-Second (1,800 Frames @ 30 FPS) Clean Multi-Angle + Picture-in-Picture (PiP) Director Timeline
// Strictly data-driven (zero view logic): maps video time [0..60s] -> simulation time, Main station, and 0..2 PiP stations.

export function buildMontageSchedule(shock1Time = 109.4) {
  const seg4SimStart = Math.max(102.0, shock1Time - 2.6);
  return [
    // 1. Final Bomb Run: Captain Hands & Boeing Yoke (Main) + Bombardier Norden Crosshair on Aioi T-Bridge (PiP)
    {
      vidStart: 0.0,
      vidEnd: 6.0,
      simStart: 14.5,
      simEnd: 20.5,
      main: "captain",
      pips: [{ station: "bombardier", slot: "br", reticle: true }],
    },
    // 2. Bomb Release ("Little Boy" Drops at vid=7.5s / sim=22.0s): Escort Bomb Bay (Main) + Dual PiP (Captain Yoke + Bombardier)
    {
      vidStart: 6.0,
      vidEnd: 11.0,
      simStart: 20.5,
      simEnd: 25.5,
      main: "escort",
      pips: [
        { station: "captain", slot: "bl", reticle: false },
        { station: "bombardier", slot: "br", reticle: true },
      ],
    },
    // 3. 60° Right Diving Breakaway (2.0 G): Captain Cranking Boeing Bakelite Yoke & A-11 Watch (Main) + Escort Bank (PiP)
    {
      vidStart: 11.0,
      vidEnd: 16.5,
      simStart: 25.5,
      simEnd: 33.75,
      main: "captain",
      pips: [{ station: "escort", slot: "br", reticle: false }],
    },
    // 4. Sweeping Exterior 60° Bank Over Hiroshima Basin (Main) + Captain Cockpit Instruments & Hands (PiP)
    {
      vidStart: 16.5,
      vidEnd: 21.0,
      simStart: 33.75,
      simEnd: 40.5,
      main: "escort",
      pips: [{ station: "captain", slot: "br", reticle: false }],
    },
    // 5. 580m Airburst Detonation (vid=24.0s / sim=66.4s): Tail Gunner Direct Sightline (Main) + Dual PiP (Captain Flash + Escort)
    {
      vidStart: 21.0,
      vidEnd: 28.5,
      simStart: 63.4,
      simEnd: 70.9,
      main: "tail_gunner",
      pips: [
        { station: "captain", slot: "bl", reticle: false },
        { station: "escort", slot: "br", reticle: false },
      ],
    },
    // 6. Rising Toroidal Fireball & Ground Mach Wave Over Hiroshima: Escort Overview (Main) + Tail Gunner Turret (PiP)
    {
      vidStart: 28.5,
      vidEnd: 36.0,
      simStart: 70.9,
      simEnd: 78.4,
      main: "escort",
      pips: [{ station: "tail_gunner", slot: "br", reticle: false }],
    },
    // 7. 18.5 km Dual Supersonic Shockwave Impact: Captain Violent Cockpit Jolt (Main) + Tail Gunner Plume (PiP)
    {
      vidStart: 36.0,
      vidEnd: 43.5,
      simStart: seg4SimStart,
      simEnd: seg4SimStart + 7.5,
      main: "captain",
      pips: [{ station: "tail_gunner", slot: "br", reticle: false }],
    },
    // 8. Post-Shockwave Banked Turn Initiation: Tail Gunner (Main) + Escort Left Bank (PiP)
    {
      vidStart: 43.5,
      vidEnd: 48.0,
      simStart: seg4SimStart + 7.5,
      simEnd: seg4SimStart + 12.0,
      main: "tail_gunner",
      pips: [{ station: "escort", slot: "br", reticle: false }],
    },
    // 9. Epilogue Observation Turn: 5 o'clock High Dorsal Chase & Mushroom Plume (Main) + Captain Port Window (PiP)
    {
      vidStart: 48.0,
      vidEnd: 54.5,
      simStart: 123.0,
      simEnd: 129.5,
      main: "escort",
      pips: [{ station: "captain", slot: "br", reticle: false }],
    },
    // 10. Full-Bleed Widescreen Finale: Silver B-29 Banking Before 8.5 km Stratospheric Plume Over Hiroshima
    {
      vidStart: 54.5,
      vidEnd: 60.01,
      simStart: 129.5,
      simEnd: 135.0,
      main: "escort",
      pips: [],
    },
  ];
}

// Normalized Picture-in-Picture (PiP) rectangle layouts in 16:9 screen coordinates (top-left origin for CSS/2D, converted for WebGL)
export const PIP_SLOTS_16_9 = {
  // Single PiP (Bottom-Right, crisp 16:9 inset)
  single_br: { leftFrac: 0.682, topFrac: 0.668, widthFrac: 0.292, heightFrac: 0.292 },
  // Dual PiP (Symmetric Bottom-Left & Bottom-Right 16:9 insets during Release & Detonation climaxes)
  dual_bl: { leftFrac: 0.026, topFrac: 0.688, widthFrac: 0.268, heightFrac: 0.268 },
  dual_br: { leftFrac: 0.706, topFrac: 0.688, widthFrac: 0.268, heightFrac: 0.268 },
};
