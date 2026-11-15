// 1945 Hiroshima Authentic Geographic, Hydrological, Topographic & Urban Landmark Dataset
// World Origin [0, 0, 0] = Ground Hypocenter (Shima Surgical Hospital, Saiku-machi)
// Aiming Point [-190, 0, -150] = Aioi "T" Bridge (~242m NW of Shima Hospital)
// Axes: +X = East, -X = West, +Z = South (Hiroshima Bay), -Z = North (Upstream Ota River Valley)

export const HIROSHIMA_GEO = {
  earthRadiusM: 6371000.0,
  coastlineSouthZ: 2720.0,

  hypocenter: {
    name: "Shima Surgical Hospital",
    x: 0.0,
    z: 0.0,
    burstAltM: 580.0,
  },

  aimingPoint: {
    name: "Aioi T-Bridge",
    x: -190.0,
    z: -150.0,
    mainSpanHalfLen: 64.0,
    mainSpanAzimuthRad: 0.08, // E-W span across Old Ota fork
    stemLen: 76.0, // S-SW stem onto Nakajima tip
    deckWidth: 15.0,
  },

  // 7 Authentic Ota River Delta Channels (widths strictly 65m..135m per 1945 US Army Map Service 1:12,500)
  // Fork of Old Ota into Honkawa (West) and Motoyasu (East) occurs directly beneath Aioi Bridge [-190, -150]!
  rivers: [
    {
      id: "ota_trunk",
      name: "Ota Trunk (Upstream)",
      width: 132.0,
      pts: [[-860, -8200], [-490, -4600], [-250, -1950], [-190, -150]],
    },
    {
      id: "honkawa",
      name: "Honkawa (Old Ota West Fork)",
      width: 96.0,
      pts: [[-190, -150], [-365, 620], [-560, 1740], [-740, 3150]],
    },
    {
      id: "motoyasu",
      name: "Motoyasu (East Fork past A-Bomb Dome)",
      width: 78.0,
      pts: [[-190, -150], [-115, -25], [-92, 820], [-105, 1880], [-135, 3200]],
    },
    {
      id: "tenmagawa",
      name: "Tenmagawa",
      width: 72.0,
      pts: [[-365, 620], [-830, 960], [-1260, 1820], [-1640, 3050]],
    },
    {
      id: "fukushimagawa",
      name: "Fukushimagawa (Yamategawa)",
      width: 88.0,
      pts: [[-250, -1950], [-1180, -480], [-1980, 1120], [-2520, 2850]],
    },
    {
      id: "kyobashigawa",
      name: "Kyobashigawa (West of Hijiyama)",
      width: 86.0,
      pts: [[-235, -1480], [420, -520], [760, 480], [880, 1780], [960, 3150]],
    },
    {
      id: "enkogawa",
      name: "Enkogawa (East of Hijiyama)",
      width: 78.0,
      pts: [[420, -520], [1480, -320], [2160, 480], [2220, 1580], [2120, 3150]],
    },
  ],

  // Rectangular Outer Water Moat of Hiroshima Castle (Chujo-machi, ~980m North of Hypocenter)
  castleMoat: {
    cx: 110.0,
    cz: -960.0,
    halfW: 195.0,
    halfD: 215.0,
    moatWidth: 34.0,
  },

  // Key Named Mountains Framing the Hiroshima Delta Basin (Exact GPS offsets from Shima Hospital 34.39458°N, 132.45479°E)
  mountains: [
    { name: "Mt. Takeda (NW Ota Valley Gate)", cx: -2850, cz: -5900, rx: 2200, rz: 2600, h: 411 },
    { name: "Mt. Ushita & Mitaki", cx: 1280, cz: -3400, rx: 1650, rz: 1950, h: 261 },
    { name: "Mt. Futaba", cx: 2499, cz: -934, rx: 920, rz: 740, h: 139 },
    { name: "Hijiyama Hill", cx: 1673, cz: 1008, rx: 520, rz: 680, h: 71 },
    { name: "Mt. Ogon (Kogane-yama)", cx: 3308, cz: 2993, rx: 980, rz: 920, h: 221 },
    { name: "Koi & Chausu Western Hills", cx: -3450, cz: -420, rx: 1850, rz: 3200, h: 245 },
  ],

  // Authentic Seto Inland Sea Islands (Exact GPS offsets from Shima Hospital)
  islands: [
    { name: "Kanawajima", cx: 2850, cz: 5650, rx: 880, rz: 1250, h: 158 },
    { name: "Ninoshima (Aki-no-Kofuji)", cx: -1680, cz: 8772, rx: 1850, rz: 1550, h: 278 },
    { name: "Etajima (Furutaka-yama)", cx: 2417, cz: 14407, rx: 4200, rz: 4900, h: 392 },
    { name: "Nomijima (West Etajima)", cx: -2100, cz: 15200, rx: 3600, rz: 3800, h: 402 },
    { name: "Miyajima (Itsukushima · Mt. Misen)", cx: -12418, cz: 12755, rx: 4400, rz: 6600, h: 535 },
  ],

  // Major Bridges across the 7 Ota Channels (rendered as 3D truss/girder decks + piers)
  bridges: [
    { name: "Motoyasu Bridge", x1: -140, z1: 95, x2: -48, z2: 95, width: 11 },
    { name: "Honkawa Bridge", x1: -325, z1: 110, x2: -215, z2: 125, width: 11 },
    { name: "Shin-Ohashi", x1: -145, z1: 560, x2: -50, z2: 560, width: 11 },
    { name: "Sumiyoshi Bridge", x1: -505, z1: 1150, x2: -395, z2: 1165, width: 11 },
    { name: "Yokogawa Bridge", x1: -315, z1: -1450, x2: -185, z2: -1450, width: 13 },
    { name: "Kyobashi Bridge", x1: 635, z1: -110, x2: 735, z2: -95, width: 11 },
    { name: "Hijiyama Bridge", x1: 785, z1: 790, x2: 890, z2: 790, width: 12 },
    { name: "Kojin Bridge", x1: 1180, z1: -50, x2: 1280, z2: 10, width: 11 },
  ],

  // Core Historical Landmarks for Dedicated 3D Modeling
  landmarks: {
    aBombDome: {
      name: "Prefectural Industrial Promotion Hall (A-Bomb Dome)",
      x: -56.0, // East bank of Motoyasu River, ~160m SE of Aioi Bridge & ~65m NW of Shima Hospital
      z: -34.0,
      rotY: -0.22,
    },
    shimaHospital: {
      name: "Shima Surgical Hospital (Ground Zero)",
      x: 0.0,
      z: 0.0,
      rotY: 0.05,
    },
    fukuyaDeptStore: {
      name: "Fukuya Department Store (Hatchobori RC Building)",
      x: 520.0,
      z: -95.0,
      rotY: 0.06,
    },
    chugokuShimbun: {
      name: "Chugoku Shimbun / Bank of Japan RC Block",
      x: 210.0,
      z: 240.0,
      rotY: 0.04,
    },
    ujinaPort: {
      name: "Ujina Military Shipping Piers",
      x: 920.0,
      z: 4220.0,
      pierCount: 5,
    },
  },

  // Urban District Bounding Envelope across 1945 6 Delta Islands, Ujina, Danbara, Yokogawa & Koi Valley Corridors
  cityBounds: {
    minX: -4150,
    maxX: 4050,
    minZ: -3850,
    maxZ: 4320,
    blastCollapseRadiusM: 2150.0,
  },
};
