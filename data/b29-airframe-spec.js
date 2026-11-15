// Boeing B-29-45-MO Superfortress ("Enola Gay", S/N 44-86292, Silverplate #82)
// Complete 30.18m Airframe, Boeing 117 Wing (22%->9%), Twin-Chin R-3350 Nacelles,
// Curtiss Electric Cuffed 4-Blade Propellers, Dual Bomb Bays, Tail Turret & Crew IK Spec

export const B29_AIRFRAME_SPEC = {
  totalLengthM: 30.18, // noseTipZ (-5.65m) to tailConeTipZ (+24.53m) = 30.18m (99 ft 0 in)
  tailCode: "82",
  tailGroupMarking: "CIRCLE_R", // Authentic Aug 6, 1945 6th BG deceptive tail insignia used by 509th CG

  cockpit: {
    cabinRadius: 1.45,
    noseTipZ: -5.65,
    greenhouseStartZ: -2.15,
    aftBulkheadZ: -1.35,

    // 4 Historical Crew & Escort Camera Anchors (Aircraft Local Space: +X=Starboard, -X=Port, +Y=Up, -Z=Forward)
    captainEye: [-0.54, 0.42, -3.15],
    copilotEye: [0.54, 0.42, -3.15],
    bombardierEye: [0.0, -0.14, -5.06],
    tailGunnerEye: [0.0, 0.40, 24.06],

    copilotSeat: [0.54, -0.18, -3.12],
    captainSeat: [-0.54, -0.18, -3.12],
    engineerSeat: [0.58, -0.16, -1.98],
    bombardierSeat: [0.0, -0.44, -4.55],
    tailGunnerSeat: [0.0, -0.12, 23.38],

    // Offset Outboard Boeing Control Column Floor Roots -> Curve Inward to Chest-Height Wheel Hubs (+0.22m)!
    yokeFloorLeft: [-0.81, -0.66, -3.54],
    yokeFloorRight: [0.81, -0.66, -3.54],
    yokePivotLeft: [-0.54, 0.22, -3.54],
    yokePivotRight: [0.54, 0.22, -3.54],
    panelZ: -3.96,
    engineerPanelZ: -1.62,

    // Analytical Two-Bone Arm IK Lengths (meters)
    ikArm: {
      upperArmLen: 0.33,
      forearmLen: 0.31,
      shoulderOffsetLeft: [-0.19, 0.37, 0.02],
      shoulderOffsetRight: [0.19, 0.37, 0.02],
    },

    // Stepless Hemispherical Greenhouse Nose Loft Stations (-1.55m -> -5.65m) with authentic downward bombardier nose droop!
    noseStations: [
      { z: -1.55, r: 1.46, cy: 0.00 },
      { z: -2.38, r: 1.45, cy: 0.00 },
      { z: -3.68, r: 1.35, cy: -0.04 },
      { z: -4.44, r: 1.15, cy: -0.14 },
      { z: -5.02, r: 0.89, cy: -0.24 },
      { z: -5.42, r: 0.58, cy: -0.31 },
      { z: -5.65, r: 0.30, cy: -0.35 },
    ],

    // Authentic Boeing B-29 Multi-Pane Greenhouse Meridian Angles:
    // 0° center post + wide unobstructed +-32° flat Pilot/Copilot main windshields + +-60° quarter panes + +-92° side window sills!
    meridianAnglesDeg: [-144, -92, -60, -32, 0, 32, 60, 92, 144],
  },

  // Full 30.18m Circular Fuselage Loft Stations from Cockpit Ring (-2.15m) to Tail Gunner Cone (+24.53m)
  fuselage: {
    stations: [
      { z: -2.15, r: 1.45, cy: 0.00 },
      { z: -0.95, r: 1.46, cy: 0.00 },
      { z: 1.80, r: 1.46, cy: 0.00 },
      { z: 5.20, r: 1.46, cy: 0.00 },
      { z: 9.60, r: 1.44, cy: 0.01 },
      { z: 13.40, r: 1.32, cy: 0.05 },
      { z: 17.20, r: 1.10, cy: 0.12 },
      { z: 20.60, r: 0.84, cy: 0.20 },
      { z: 23.30, r: 0.58, cy: 0.26 },
      { z: 24.53, r: 0.30, cy: 0.28 },
    ],
    forwardBombBay: { zStart: -0.92, zEnd: 3.48, doorArcDeg: 58 },
    aftBombBay: { zStart: 5.30, zEnd: 9.35 },
    empennage: {
      finRootZStart: 15.8,
      finLEZ: 18.6,
      finTEZ: 23.6,
      finTipZStart: 20.9,
      finTipZEnd: 23.2,
      finTopY: 6.15,
      hStabHalfSpan: 6.58,
      hStabRootLEZ: 19.6,
      hStabRootChord: 2.85,
      hStabTipChord: 1.32,
      hStabSweepDeg: 9.5,
      hStabY: 0.52,
    },
  },

  // Boeing 117 High-Aspect-Ratio Wing (Authentic 22% root thickness -> 9% tip thickness!)
  wing: {
    halfSpan: 21.52, // 43.04m (141 ft 3 in) full span
    rootChord: 5.18,
    tipChord: 2.15,
    rootLEZ: -0.35,
    sweepDeg: 7.2,
    dihedralDeg: 4.5,
    rootY: 0.08,
    thicknessRatioRoot: 0.22,
    thicknessRatioTip: 0.09,
    flapTrackX: [3.2, 6.8, 11.2, 14.8],
  },

  // 4x Wright R-3350-57 Duplex-Cyclone Twin-Chin Nacelles & Curtiss Electric Cuffed 4-Blade Props
  engines: [
    { id: 1, x: -9.45, y: 0.04, z: -1.85, radius: 0.86, length: 5.65, propRadius: 2.53, rpmPhase: 0.0 },
    { id: 2, x: -4.68, y: -0.10, z: -2.22, radius: 0.89, length: 6.35, propRadius: 2.53, rpmPhase: 1.37 },
    { id: 3, x: 4.68, y: -0.10, z: -2.22, radius: 0.89, length: 6.35, propRadius: 2.53, rpmPhase: 2.81 },
    { id: 4, x: 9.45, y: 0.04, z: -1.85, radius: 0.86, length: 5.65, propRadius: 2.53, rpmPhase: 4.19 },
  ],
};
