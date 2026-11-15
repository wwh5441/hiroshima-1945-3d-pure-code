// August 6, 1945 · 08:15:17 JST · B-29-45-MO "Enola Gay" (44-86292, Tactical #82)
// Authentic Aerodynamic, Meteorological, Ballistic & Multi-Station Camera Specification

export const MISSION_1945 = {
  targetFps: 30,
  durationSeconds: 142.0,
  baseClockHms: [8, 14, 55],

  // Historical Bombing & Detonation Constants
  releaseTime: 22.0,
  detonationTime: 66.4, // Exact 44.4s physical free-fall from 9,467m to 580m
  releaseAltitudeM: 9467.0, // 31,060 ft MSL
  burstOrigin: [0.0, 580.0, 0.0], // 580m (1,900 ft) airburst directly above Shima Hospital [0, 0, 0]
  aimPointAioi: [-190.0, 0.0, -150.0], // Historical Norden aiming point: Aioi "T" Bridge (~242m NW of hypocenter)

  // Upper-Tropospheric Radiosonde Wind over Hiroshima (Aug 6, 1945 morning)
  // TAS = 328 mph (146.63 m/s), Westerly Headwind = 43 mph (19.222 m/s) -> Ground Speed = 285 mph (127.41 m/s)
  initialHeadingDeg: 266.0,
  initialTasMps: 146.63,
  wind: {
    fromHeadingDeg: 266.0,
    speedAtReleaseMps: 19.222,
    speedAtReleaseMph: 43.0,
    shearBaseAltM: 4500.0,
    shearExp: 1.6,
  },

  // Mk-1 "Little Boy" Physical Properties (4,400 kg, 28-inch / 0.7112m diameter, box-fin assembly)
  bombSpec: {
    massKg: 4400.0,
    diameterM: 0.7112,
    subsonicCd: 0.16,
    dragMachCrit: 0.76,
    transonicWaveCd: 20.3637, // Calibrated via RK4 with ISA rho(h) so 9,467m -> 580m takes 44.40s
  },

  // Bomb Bay Door Actuation Window (seconds)
  bombBayTiming: {
    openStart: 12.5,
    fullyOpen: 16.5,
    closeStart: 24.5,
    fullyClosed: 28.5,
  },

  // Morning 08:15 AM JST Solar Vector (East-Southeast, 36.2° elevation)
  sunDirection: [0.738, 0.591, 0.326],

  markers: [
    { time: 22.0, label: "投弹" },
    { time: 66.4, label: "起爆" },
  ],

  // 100% Physics-Driven Coordinated Flight Control Schedule
  // Heading turn rate is NEVER hardcoded; computed strictly via omega = g * tan(roll) / V_tas (G <= 2.15G)
  // 0..22s   : Westbound Norden bomb run (266°, TAS 328 mph, Headwind 43 mph -> GS 285 mph, lead ~5,498m)
  // 22..50.2s: Tibbets' historical RIGHT 60° diving breakaway turn (+156.8° onto 062.8° ENE, diving ~550m)
  // 50.2..112s: Full-power ENE escape with tailwind (~390 mph GS); 580m flash at 66.4s; dual tail shockwaves at ~109.4s & ~111.0s at 18.5 km slant range!
  // 112..142s: Post-shockwave banked left observation turn so Captain & crew view stratospheric mushroom cloud
  flightSchedule: [
    { t: 0.0, rollDeg: 0.0, pitchDeg: 0.3, tasMps: 146.63, climbMps: 0.0, throttle: 0.74 },
    { t: 22.0, rollDeg: 0.0, pitchDeg: 0.3, tasMps: 146.63, climbMps: 0.0, throttle: 0.74 },
    { t: 24.0, rollDeg: 60.0, pitchDeg: -5.6, tasMps: 151.0, climbMps: -21.0, throttle: 0.98 },
    { t: 47.2, rollDeg: 60.0, pitchDeg: -5.0, tasMps: 162.5, climbMps: -19.5, throttle: 0.98 },
    { t: 50.2, rollDeg: 0.0, pitchDeg: -0.8, tasMps: 161.0, climbMps: -3.0, throttle: 0.88 },
    { t: 66.4, rollDeg: 0.0, pitchDeg: 0.0, tasMps: 155.0, climbMps: 0.0, throttle: 0.84 },
    { t: 112.2, rollDeg: 0.0, pitchDeg: 0.1, tasMps: 150.0, climbMps: 0.0, throttle: 0.80 },
    { t: 113.8, rollDeg: -58.0, pitchDeg: 0.2, tasMps: 146.0, climbMps: 0.2, throttle: 0.82 },
    { t: 129.8, rollDeg: -58.0, pitchDeg: 0.3, tasMps: 144.0, climbMps: 0.4, throttle: 0.80 },
    { t: 131.8, rollDeg: -9.0, pitchDeg: 0.3, tasMps: 144.0, climbMps: 0.3, throttle: 0.76 },
    { t: 142.0, rollDeg: -7.5, pitchDeg: 0.3, tasMps: 144.0, climbMps: 0.2, throttle: 0.76 },
  ],

  // 4 Historical Crew & Escort Camera Stations + Auto Director Mode ("auto")
  stations: [
    { id: "captain", key: "1", shortLabel: "1·机长", title: "COL. PAUL TIBBETS · LEFT SEAT" },
    { id: "bombardier", key: "2", shortLabel: "2·投弹手", title: "MAJ. THOMAS FEREBEE · NORDEN M-9" },
    { id: "tail_gunner", key: "3", shortLabel: "3·尾炮手", title: "SGT. BOB CARON · TAIL TURRET" },
    { id: "escort", key: "4", shortLabel: "4·伴飞", title: "THE GREAT ARTISTE · ESCORT VIEW" },
  ],

  // Auto-Director historical montage cuts when user is in "auto" (key 0) mode
  autoDirectorSchedule: [
    { start: 0.0, end: 10.5, station: "captain" },
    { start: 10.5, end: 25.0, station: "bombardier" },
    { start: 25.0, end: 58.0, station: "captain" },
    { start: 58.0, end: 113.5, station: "tail_gunner" },
    { start: 113.5, end: 127.5, station: "captain" },
    { start: 127.5, end: 142.5, station: "escort" },
  ],

  // Left-Seat Captain Head Choreography (Station 1)
  cameraKeyframes: [
    { t: 0.0, yawDeg: -2.0, pitchDeg: -15.0, rollBiasDeg: 0.0, fov: 58, lean: [0.0, 0.0, 0.0] },
    { t: 9.0, yawDeg: 2.0, pitchDeg: -20.0, rollBiasDeg: 0.0, fov: 56, lean: [0.01, 0.02, -0.05] },
    { t: 16.5, yawDeg: -16.0, pitchDeg: -14.0, rollBiasDeg: 0.0, fov: 58, lean: [0.03, 0.0, -0.02] },
    { t: 21.5, yawDeg: 0.0, pitchDeg: -19.0, rollBiasDeg: 0.0, fov: 58, lean: [0.0, 0.01, -0.04] },

    // Right 60° diving breakaway turn (framing both hands on Boeing yoke, Elgin A-11 watch, Sperry gyro & banking Hiroshima delta)
    { t: 24.5, yawDeg: -6.5, pitchDeg: -18.5, rollBiasDeg: -3.5, fov: 60, lean: [0.02, -0.01, 0.02] },
    { t: 35.0, yawDeg: -5.5, pitchDeg: -19.0, rollBiasDeg: -4.0, fov: 61, lean: [0.02, -0.01, 0.02] },
    { t: 48.0, yawDeg: -4.0, pitchDeg: -16.5, rollBiasDeg: -2.0, fov: 60, lean: [0.01, -0.01, 0.01] },

    // ENE level escape: cockpit flooded by 66.4s double flash from astern -> 109.4s & 111.0s tail shockwaves
    { t: 64.0, yawDeg: -6.0, pitchDeg: -14.0, rollBiasDeg: 0.0, fov: 60, lean: [0.0, 0.0, 0.0] },
    { t: 67.2, yawDeg: 22.0, pitchDeg: -10.0, rollBiasDeg: 1.5, fov: 62, lean: [-0.06, 0.01, 0.0] },
    { t: 95.0, yawDeg: -4.0, pitchDeg: -15.0, rollBiasDeg: 0.0, fov: 60, lean: [0.0, 0.0, 0.0] },
    { t: 110.0, yawDeg: 8.0, pitchDeg: -12.0, rollBiasDeg: 2.0, fov: 61, lean: [-0.03, 0.0, 0.02] },

    // Post-shockwave left bank: Captain leans left to look out port window at stratospheric mushroom cloud!
    { t: 118.0, yawDeg: 68.0, pitchDeg: -10.0, rollBiasDeg: 2.0, fov: 60, lean: [-0.15, 0.02, -0.02] },
    { t: 127.0, yawDeg: 98.0, pitchDeg: -6.0, rollBiasDeg: 1.5, fov: 60, lean: [-0.18, 0.03, -0.02] },
    { t: 142.0, yawDeg: 96.0, pitchDeg: -2.0, rollBiasDeg: 1.0, fov: 59, lean: [-0.18, 0.03, -0.02] },
  ],

  acts: [
    {
      start: 0.0,
      end: 21.8,
      title: "ACT I · FINAL BOMB RUN · 31,060 FT · GS 285 MPH",
      caption: "08:15 JST · 顶风 43 mph 西向进入广岛上空 9,467 米。诺顿瞄准镜锁定太田川分叉口相生桥“T”字桥。",
    },
    {
      start: 21.8,
      end: 50.5,
      title: "ACT II · RELEASE & 158° RIGHT DIVING BREAKAWAY",
      caption: "前弹舱双门开启，“Little Boy”脱钩下落。机长 Tibbets 立即向右猛压 60° 坡度俯冲急转 157° 改向东北全速脱离。",
    },
    {
      start: 50.5,
      end: 66.35,
      title: "ACT III · 44.4 SECONDS OF BALLISTIC FALL",
      caption: "B-29 顺高空西风向东北高速逃离；机尾炮手 Bob Caron 面朝正后方死死盯住广岛上空，倒计时逼近零秒。",
    },
    {
      start: 66.35,
      end: 108.5,
      title: "ACT IV · 580M AIRBURST ABOVE SHIMA HOSPITAL",
      caption: "相生桥东南 240 米岛病院上空 580 米起爆！双脉冲强光瞬间灌满温室座舱，威尔逊凝结环与涡环火球在机尾正后方无声升腾。",
    },
    {
      start: 108.5,
      end: 115.5,
      title: "ACT V · 18.5 KM TAIL SHOCKWAVE IMPACT (\"FLAK!\")",
      caption: "起爆 43 秒后、斜距达 18.5 公里处，直达激波与地面反射波从机尾正后下方先后追尾重锤机身，全机如遭高炮齐射剧烈颠簸。",
    },
    {
      start: 115.5,
      end: 142.5,
      title: "EPILOGUE · TURN TO OBSERVE STRATOSPHERIC PLUME",
      caption: "冲击波过后机身左倾回望，翻滚的花椰菜状炭灰菌冠已刺穿万米平流层，笼罩太田川三角洲与濑户内海。",
    },
  ],
};
