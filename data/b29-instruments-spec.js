// Authentic 1945 USAAF AN-Standard B-29 Flight & Flight Engineer Instrument Specification
// Strictly respects B-29 crew division of labor:
// - Captain (Left) & Copilot (Right) panels hold flight/navigation instruments ONLY (zero engine RPM/MAP!)
// - Flight Engineer (Aft-facing station behind Copilot) holds full 4-engine R-3350 monitoring array!

export const B29_INSTRUMENTS_SPEC = {
  atlasSize: 2048,
  radiumColor: "#d4ebb0",
  bezelColor: "#1a1e21",
  panelColor: "#222724",

  // Shared 4x4 Procedural Dial Face Atlas Cells
  atlasCells: [
    { id: "asi", title: "AIRSPEED", unit: "MPH", type: "needle1", atlasGrid: [0, 0], minVal: 60, maxVal: 450, majorStep: 50 },
    { id: "horizon", title: "AN 5736-1", unit: "FLIGHT GYRO", type: "horizon", atlasGrid: [1, 0] },
    { id: "alt", title: "ALTITUDE", unit: "FEET x1000", type: "altimeter", atlasGrid: [2, 0], minVal: 0, maxVal: 10, majorStep: 1 },
    { id: "turnbank", title: "TURN & BANK", unit: "AN 5820", type: "turnbank", atlasGrid: [3, 0] },
    { id: "dg", title: "AN 5735-1", unit: "DIR GYRO", type: "dg_drum", atlasGrid: [0, 1] },
    { id: "vsi", title: "RATE OF CLIMB", unit: "1000 FT/MIN", type: "vsi", atlasGrid: [1, 1], minVal: -4, maxVal: 4, majorStep: 1 },
    { id: "rci", title: "RADIO COMP", unit: "SCR-269", type: "rci", atlasGrid: [2, 1] },
    { id: "clock", title: "ELGIN A-11", unit: "U.S. ARMY", type: "clock", atlasGrid: [3, 1] },
    { id: "gmeter", title: "ACCELEROMETER", unit: "G UNITS", type: "needle1", atlasGrid: [0, 2], minVal: -1, maxVal: 4, majorStep: 1 },
    { id: "cabinalt", title: "CABIN PRESS", unit: "1000 FT", type: "needle1", atlasGrid: [1, 2], minVal: 0, maxVal: 35, majorStep: 5 },
    { id: "oxy", title: "OXYGEN PRESS", unit: "PSI x100", type: "needle1", atlasGrid: [2, 2], minVal: 0, maxVal: 5, majorStep: 1 },
    { id: "suction", title: "SUCTION", unit: "IN HG", type: "needle1", atlasGrid: [3, 2], minVal: 0, maxVal: 10, majorStep: 2 },
    { id: "eng_rpm", title: "TACHOMETER", unit: "RPM x100", type: "needle1", atlasGrid: [0, 3], minVal: 5, maxVal: 30, majorStep: 5 },
    { id: "eng_map", title: "MAN PRESS", unit: "IN HG", type: "needle1", atlasGrid: [1, 3], minVal: 10, maxVal: 60, majorStep: 10 },
    { id: "eng_cht", title: "CYL TEMP", unit: "DEG C x100", type: "needle1", atlasGrid: [2, 3], minVal: 0, maxVal: 3, majorStep: 1 },
    { id: "eng_oil", title: "OIL PRESS", unit: "PSI", type: "needle1", atlasGrid: [3, 3], minVal: 0, maxVal: 120, majorStep: 30 },
  ],

  // Captain Left Main Panel (x: [-0.98, -0.14], y: [-0.32, +0.11] on z = panelZ)
  captainDials: [
    { instId: "asi", cellId: "asi", panelPos: [-0.77, 0.015], radius: 0.072 },
    { instId: "horizon", cellId: "horizon", panelPos: [-0.55, 0.02], radius: 0.082 },
    { instId: "alt", cellId: "alt", panelPos: [-0.33, 0.015], radius: 0.072 },
    { instId: "turnbank", cellId: "turnbank", panelPos: [-0.77, -0.155], radius: 0.068 },
    { instId: "dg", cellId: "dg", panelPos: [-0.55, -0.155], radius: 0.074 },
    { instId: "vsi", cellId: "vsi", panelPos: [-0.33, -0.155], radius: 0.068 },
    { instId: "gmeter", cellId: "gmeter", panelPos: [-0.93, 0.01], radius: 0.050 },
    { instId: "clock", cellId: "clock", panelPos: [-0.93, -0.12], radius: 0.048 },
    { instId: "rci", cellId: "rci", panelPos: [-0.19, 0.01], radius: 0.058 },
    { instId: "suction", cellId: "suction", panelPos: [-0.19, -0.14], radius: 0.050 },
  ],

  // Copilot Right Main Panel (x: [+0.14, +0.98], y: [-0.32, +0.11] on z = panelZ) — Full Twin Flight Set!
  copilotDials: [
    { instId: "cp_asi", cellId: "asi", panelPos: [0.33, 0.015], radius: 0.072 },
    { instId: "cp_horizon", cellId: "horizon", panelPos: [0.55, 0.02], radius: 0.082 },
    { instId: "cp_alt", cellId: "alt", panelPos: [0.77, 0.015], radius: 0.072 },
    { instId: "cp_turnbank", cellId: "turnbank", panelPos: [0.33, -0.155], radius: 0.068 },
    { instId: "cp_dg", cellId: "dg", panelPos: [0.55, -0.155], radius: 0.074 },
    { instId: "cp_vsi", cellId: "vsi", panelPos: [0.77, -0.155], radius: 0.068 },
    { instId: "cp_rci", cellId: "rci", panelPos: [0.19, 0.01], radius: 0.058 },
    { instId: "cp_cabinalt", cellId: "cabinalt", panelPos: [0.19, -0.14], radius: 0.050 },
    { instId: "cp_oxy", cellId: "oxy", panelPos: [0.93, 0.01], radius: 0.050 },
    { instId: "cp_clock", cellId: "clock", panelPos: [0.93, -0.12], radius: 0.048 },
  ],

  // Flight Engineer 4-Engine Matrix (4 columns = Engines #1..#4, 4 rows = RPM, MAP, CHT, OIL)
  engineerGrid: {
    rows: ["eng_rpm", "eng_map", "eng_cht", "eng_oil"],
    engineCount: 4,
    dialRadius: 0.042,
  },
};
