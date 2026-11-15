import * as THREE from "../vendor/three.module.js";
import { validateMissionConfig } from "../schemas/mission.schema.js";
import { validateAircraftSpec } from "../schemas/aircraft.schema.js";
import { MISSION_1945 } from "../data/mission-1945.js";
import { HIROSHIMA_GEO } from "../data/hiroshima-geo.js";
import { B29_AIRFRAME_SPEC } from "../data/b29-airframe-spec.js";
import { B29_INSTRUMENTS_SPEC } from "../data/b29-instruments-spec.js";

import { CinemaClock } from "./core/clock.js";
import { QUALITY_PRESETS } from "./core/quality.js";
import { DualFrustumHdrEngine } from "./core/engine.js";

import { FlightDynamics } from "./physics/flight-dynamics.js";
import { HeadInertiaController } from "./physics/head-inertia.js";

import { createHiroshimaTerrain } from "./world/hiroshima-terrain.js";
import { createHiroshimaCity } from "./world/hiroshima-city.js";
import { DEFAULT_TERRAIN_MODE, isValidTerrainMode, loadTerrainDem } from "./world/terrain-modes.js";
import { createLoftedAirframe } from "./aircraft/lofted-airframe.js";
import { createFuselageAndEmpennage } from "./aircraft/fuselage-empennage.js";
import { createGreenhouseCockpit } from "./aircraft/greenhouse-cockpit.js";
import { createCaptainInstruments } from "./aircraft/instruments-canvas.js";
import { createFlightEngineerAndOverhead } from "./aircraft/flight-engineer-station.js";
import { createCrewAndControls } from "./aircraft/crew-animator.js";

import { MissionAudioDirector } from "./audio/audio-self-test.js";
import { CameraStationController } from "./ui/camera-stations.js";
import { installSubtleLookDrag } from "./ui/director-camera.js";
import { HudController } from "./ui/hud-controller.js";
import { CleanPipDirector } from "./ui/clean-pip-director.js";
import { TimelineBar } from "./ui/timeline-bar.js";
import { TerrainSelector } from "./ui/terrain-selector.js";

function countSceneVertices(rootObject) {
  const seenGeoms = new Set();
  let totalVertices = 0;
  rootObject.traverse((obj) => {
    const g = obj.geometry;
    if (g && g.attributes && g.attributes.position && !seenGeoms.has(g)) {
      seenGeoms.add(g);
      const count = g.attributes.position.count;
      const instances = obj.isInstancedMesh ? obj.count : 1;
      totalVertices += count * instances;
    }
  });
  return totalVertices;
}

// Automated Cross-Product / Outward-Normal Self-Audit across all custom-lofted B-29 meshes
function auditAirframeNormals(airframe, fuselage, cockpit) {
  const checks = {};
  const failed = [];

  const record = (name, avgDot, minPass) => {
    const val = Number(avgDot.toFixed(4));
    checks[name] = val;
    if (!(val >= minPass)) failed.push(`${name}=${val} (<${minPass})`);
  };

  const avgRadialDot = (mesh, signOut = 1, zFilterMin = -1e9, offsetXY = [0, 0]) => {
    const pos = mesh.geometry.attributes.position;
    const nrm = mesh.geometry.attributes.normal;
    let sum = 0;
    let cnt = 0;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getZ(i) < zFilterMin) continue;
      const rx = pos.getX(i) + offsetXY[0];
      const ry = pos.getY(i) + offsetXY[1];
      const rl = Math.hypot(rx, ry);
      if (rl < 0.05) continue;
      sum += signOut * ((nrm.getX(i) * rx + nrm.getY(i) * ry) / rl);
      cnt++;
    }
    return cnt > 0 ? sum / cnt : 0;
  };

  const avgAxisSideDot = (mesh, axis) => {
    const pos = mesh.geometry.attributes.position;
    const nrm = mesh.geometry.attributes.normal;
    // For Y-camber wings/stabilizers with spanwise dihedral, compute chord-ring mean Y per spanwise X station!
    const ringSums = new Map();
    for (let i = 0; i < pos.count; i++) {
      const key = axis === "y" ? Math.round(pos.getX(i) * 100) : Math.round(pos.getY(i) * 100);
      const val = axis === "y" ? pos.getY(i) : pos.getX(i);
      const entry = ringSums.get(key);
      if (entry) {
        entry[0] += val;
        entry[1] += 1;
      } else {
        ringSums.set(key, [val, 1]);
      }
    }

    let sum = 0;
    let cnt = 0;
    for (let i = 0; i < pos.count; i++) {
      const key = axis === "y" ? Math.round(pos.getX(i) * 100) : Math.round(pos.getY(i) * 100);
      const entry = ringSums.get(key);
      const localMean = entry ? entry[0] / entry[1] : 0;
      const c = (axis === "y" ? pos.getY(i) : pos.getX(i)) - localMean;
      if (Math.abs(c) < 0.025) continue;
      const n = axis === "y" ? nrm.getY(i) : nrm.getX(i);
      sum += Math.sign(c) * n;
      cnt++;
    }
    return cnt > 0 ? sum / cnt : 0;
  };

  const avgAxisConst = (mesh, signY) => {
    const nrm = mesh.geometry.attributes.normal;
    let sum = 0;
    for (let i = 0; i < nrm.count; i++) sum += signY * nrm.getY(i);
    return sum / Math.max(1, nrm.count);
  };

  const fa = fuselage.auditRefs;
  const aa = airframe.auditRefs;
  const ca = cockpit.auditRefs;

  record("fuselageShellOutward", avgRadialDot(fa.fuselageMesh, +1), 0.85);
  record("portNose82DecalOutward", avgRadialDot(fa.portNoseDecal, +1), 0.85);
  record("stbdNose82DecalOutward", avgRadialDot(fa.stbdNoseDecal, +1), 0.85);
  record("portFusInsigniaOutward", avgRadialDot(fa.portFusInsig, +1), 0.85);
  record("stbdFusInsigniaOutward", avgRadialDot(fa.stbdFusInsig, +1), 0.85);

  const lPiv = fa.leftDoorMesh.parent.position;
  const rPiv = fa.rightDoorMesh.parent.position;
  record("leftBombDoorOutward", avgRadialDot(fa.leftDoorMesh, +1, -1e9, [lPiv.x, lPiv.y]), 0.85);
  record("rightBombDoorOutward", avgRadialDot(fa.rightDoorMesh, +1, -1e9, [rPiv.x, rPiv.y]), 0.85);

  record("verticalFinSidesOutward", avgAxisSideDot(fa.verticalFin, "x"), 0.70);
  record("leftHStabCamberOutward", avgAxisSideDot(fa.leftHStab, "y"), 0.70);
  record("rightHStabCamberOutward", avgAxisSideDot(fa.rightHStab, "y"), 0.70);

  record("leftWingCamberOutward", avgAxisSideDot(aa.leftWing, "y"), 0.70);
  record("rightWingCamberOutward", avgAxisSideDot(aa.rightWing, "y"), 0.70);
  record("upperPortWingInsigniaUp", avgAxisConst(aa.upperPortInsig, +1), 0.90);
  record("lowerStbdWingInsigniaDown", avgAxisConst(aa.lowerStbdInsig, -1), 0.90);

  aa.nacelleMeshes.forEach((m, idx) => {
    record(`nacelle${idx + 1}OuterOutward`, avgRadialDot(m, +1, 0.17), 0.75);
  });

  record("cockpitInnerQuiltInward", avgRadialDot(ca.lowerCabinWall, -1), 0.85);
  if (ca.extLowerNoseSkin) record("extLowerNoseAlcladOutward", avgRadialDot(ca.extLowerNoseSkin, +1), 0.85);
  if (ca.extUpperRoofSkin) record("extUpperRoofAlcladOutward", avgRadialDot(ca.extUpperRoofSkin, +1), 0.85);

  return {
    passed: failed.length === 0,
    checkedCount: Object.keys(checks).length,
    failed,
    dots: checks,
  };
}

async function bootstrap() {
  validateMissionConfig(MISSION_1945, HIROSHIMA_GEO);
  validateAircraftSpec(B29_AIRFRAME_SPEC, B29_INSTRUMENTS_SPEC);

  const canvas = document.getElementById("viewport");
  let qualityKey = "cinema";

  // 1. Pre-bake 1:1 coordinated flight dynamics, RK4 bomb ballistics & rear-aspect shockwave intercepts
  const dynamics = new FlightDynamics(MISSION_1945);
  const headInertia = new HeadInertiaController(MISSION_1945, B29_AIRFRAME_SPEC);
  const clock = new CinemaClock(MISSION_1945.durationSeconds, MISSION_1945.targetFps);

  // 2. Initialize Dual-Frustum RGBA16F HDR WebGL2 Engine + GPU 3D Cloud Noise Volumes
  const engine = new DualFrustumHdrEngine(canvas, MISSION_1945, QUALITY_PRESETS[qualityKey]);

  const params = new URLSearchParams(window.location.search);
  const reqTerrain = params.get("terrain");
  let activeTerrainMode = isValidTerrainMode(reqTerrain) ? reqTerrain : DEFAULT_TERRAIN_MODE;
  const initialDemArrays = await loadTerrainDem(activeTerrainMode);

  // 3. Build World Pass Scene (Sky + Curved Hiroshima 7-River Delta + 14,000+ 3D Buildings & Landmarks + Plasma Core + Falling Little Boy)
  const worldScene = new THREE.Scene();
  const hiroshimaWorld = createHiroshimaTerrain(MISSION_1945, HIROSHIMA_GEO, initialDemArrays);
  let hiroshimaCity = createHiroshimaCity(MISSION_1945, hiroshimaWorld.uniforms, HIROSHIMA_GEO, initialDemArrays);
  const airframe = createLoftedAirframe(B29_AIRFRAME_SPEC);
  worldScene.add(
    hiroshimaWorld.skyDome,
    hiroshimaWorld.terrainMesh,
    hiroshimaCity.group,
    hiroshimaWorld.plasmaCore,
    airframe.bombGroup
  );

  // 4. Build Full 30.18m B-29 Airframe, Openable Bomb Bay, Tail Turret, Dual USAAF Panels, Flight Engineer & 2-Bone IK Crew Scene
  const cockpitScene = new THREE.Scene();
  cockpitScene.environment = engine.envMap;
  cockpitScene.environmentIntensity = 1.25;
  const fuselage = createFuselageAndEmpennage(B29_AIRFRAME_SPEC, airframe.alcladMat);
  const cockpit = createGreenhouseCockpit(B29_AIRFRAME_SPEC, airframe.alcladMat);
  const instruments = createCaptainInstruments(B29_INSTRUMENTS_SPEC, B29_AIRFRAME_SPEC.cockpit.panelZ);
  const engineerStation = createFlightEngineerAndOverhead(B29_AIRFRAME_SPEC, B29_INSTRUMENTS_SPEC, instruments);
  const crew = createCrewAndControls(B29_AIRFRAME_SPEC, MISSION_1945);
  cockpitScene.add(
    airframe.group,
    fuselage.group,
    cockpit.group,
    instruments.group,
    engineerStation.group,
    crew.group
  );

  const airframeVertexCount = countSceneVertices(cockpitScene);
  let cityBuildingCount = hiroshimaCity.buildingCount;
  const normalAudit = auditAirframeNormals(airframe, fuselage, cockpit);
  if (!normalAudit.passed) {
    console.error("Airframe Outward-Normal Audit FAILED:", normalAudit.failed);
  }
  document.documentElement.dataset.cityBuildings = String(cityBuildingCount);
  document.documentElement.dataset.airframeVerts = String(airframeVertexCount);
  document.documentElement.dataset.normalsPassed = String(normalAudit.passed);

  // 5. Audio Director & Automated Self-Test
  const audio = new MissionAudioDirector(
    MISSION_1945,
    dynamics.shockwave.shock1Time,
    dynamics.shockwave.shock2Time
  );
  const audioAudit = await MissionAudioDirector.runOfflineSelfTest();

  // 6. Camera Station Switcher, HUD & Playback Scrubber
  let latestState = dynamics.evaluate(0);
  let activeStation = "captain";

  const stations = new CameraStationController(MISSION_1945, () => {
    headInertia.userLook.yaw = 0;
    headInertia.userLook.pitch = 0;
    clock.dirty = true;
    if (!clock.playing) {
      renderAt(clock.time, 1 / 30);
    }
  });

  const hud = new HudController(
    MISSION_1945,
    dynamics.shockwave.shock1Time,
    dynamics.shockwave.shock2Time
  );
  const pipDirector = new CleanPipDirector(
    MISSION_1945,
    dynamics.shockwave.shock1Time,
    dynamics.shockwave.shock2Time
  );
  const pipHeadInertia = new HeadInertiaController(MISSION_1945, B29_AIRFRAME_SPEC);

  const ui = new TimelineBar(MISSION_1945.durationSeconds, dynamics.markers, {
    async onStart() {
      try {
        await audio.unlock();
      } catch (err) {
        console.warn("WebAudio unlock skipped:", err);
      }
      clock.play();
      audio.setPaused(false);
    },
    onTogglePlay() {
      const playing = clock.toggle();
      audio.setPaused(!playing);
    },
    onReplay() {
      headInertia.reset();
      clock.restart();
      audio.seek(0);
      clock.play();
      audio.setPaused(false);
    },
    onSeek(t) {
      clock.seek(t);
      audio.seek(t);
    },
    onToggleMute() {
      return audio.toggleMute();
    },
    onCycleQuality() {
      qualityKey = qualityKey === "cinema" ? "ultra" : "cinema";
      const preset = QUALITY_PRESETS[qualityKey];
      engine.setQuality(preset);
      clock.dirty = true;
      return preset.label;
    },
  });

  const terrainSelector = new TerrainSelector(activeTerrainMode, (modeId) => {
    setTerrainMode(modeId);
  });

  async function setTerrainMode(modeId) {
    if (!isValidTerrainMode(modeId) || modeId === activeTerrainMode) return getTelemetrySafe();
    const demArrays = await loadTerrainDem(modeId);
    hiroshimaWorld.setDemArrays(demArrays);

    const nextCity = createHiroshimaCity(MISSION_1945, hiroshimaWorld.uniforms, HIROSHIMA_GEO, demArrays);
    worldScene.remove(hiroshimaCity.group);
    hiroshimaCity.dispose?.();
    hiroshimaCity = nextCity;
    worldScene.add(hiroshimaCity.group);

    cityBuildingCount = hiroshimaCity.buildingCount;
    document.documentElement.dataset.cityBuildings = String(cityBuildingCount);
    activeTerrainMode = modeId;
    terrainSelector.syncActive(modeId);
    clock.dirty = true;
    if (!clock.playing) {
      renderAt(clock.time, 1 / 30);
    }
    return simApi.getTelemetry();
  }

  function getTelemetrySafe() {
    return simApi.getTelemetry();
  }

  installSubtleLookDrag(
    canvas,
    headInertia,
    () => activeStation,
    () => {
      clock.dirty = true;
    }
  );

  window.addEventListener("resize", () => {
    engine.resize();
    clock.dirty = true;
  });

  const worldSunDir = new THREE.Vector3(...MISSION_1945.sunDirection).normalize();
  let lastMontageSegIdx = -1;

  function renderMontageAt(vidT, dt) {
    const m = pipDirector.evaluateMontage(vidT);
    if (m.segIdx !== lastMontageSegIdx) {
      headInertia.reset();
      pipHeadInertia.reset();
      lastMontageSegIdx = m.segIdx;
    }
    latestState = dynamics.evaluate(m.simTime);
    activeStation = m.mainStation;

    hiroshimaWorld.update(latestState);
    airframe.update(latestState);
    fuselage.update(latestState);
    instruments.update(latestState, MISSION_1945.baseClockHms);
    engineerStation.update(latestState);

    // 1. Full-screen Main View Pass
    cockpit.update(latestState, worldSunDir, MISSION_1945.burstOrigin, m.mainStation);
    crew.update(latestState, m.mainStation);
    const mainPose = headInertia.update(dt, latestState, m.mainStation);
    engine.renderFrame(worldScene, cockpitScene, latestState, mainPose, null);

    // 2. Picture-in-Picture (PiP) Sub-Viewport Pass(es)
    const pipRects = pipDirector.resolvePipRects(m.pips, window.innerWidth, window.innerHeight);
    for (const pr of pipRects) {
      cockpit.update(latestState, worldSunDir, MISSION_1945.burstOrigin, pr.station);
      crew.update(latestState, pr.station);
      const pipPose = pipHeadInertia.update(dt, latestState, pr.station);
      engine.renderFrame(worldScene, cockpitScene, latestState, pipPose, pr.gl);
    }

    hud.update(latestState);
    stations.updateUi(m.simTime, m.mainStation);
    pipDirector.updateLiveOverlay(pipRects);
    return { m, pipRects };
  }

  function renderAt(t, dt) {
    latestState = dynamics.evaluate(t);
    activeStation = stations.resolveStation(t);
    const headPose = headInertia.update(dt, latestState, activeStation);

    hiroshimaWorld.update(latestState);
    airframe.update(latestState);
    fuselage.update(latestState);
    cockpit.update(latestState, worldSunDir, MISSION_1945.burstOrigin, activeStation);
    instruments.update(latestState, MISSION_1945.baseClockHms);
    engineerStation.update(latestState);
    crew.update(latestState, activeStation);

    engine.renderFrame(worldScene, cockpitScene, latestState, headPose);
    pipDirector.updateLiveOverlay([]);
    hud.update(latestState);
    stations.updateUi(t, activeStation);
    ui.sync(t, clock.playing);
    audio.update(latestState, clock.playing);

    document.documentElement.dataset.fps = String(clock.fpsCounter);
    document.documentElement.dataset.simTime = t.toFixed(2);
    document.documentElement.dataset.station = activeStation;
  }

  // Expose deterministic inspection & Chief Supervisor QA API
  const simApi = {
    seek(t) {
      ui.hideBriefing(true);
      clock.pause();
      clock.seek(t);
      audio.seek(t);
      renderAt(clock.time, 1 / 30);
      return this.getTelemetry();
    },
    setStation(stationOrKey) {
      ui.hideBriefing(true);
      stations.setMode(stationOrKey);
      renderAt(clock.time, 1 / 30);
      return this.getTelemetry();
    },
    seekMontage(vidT) {
      ui.hideBriefing(true);
      pipDirector.setCleanMode(true);
      clock.pause();
      renderMontageAt(vidT, 1 / 30);
      return this.getTelemetry();
    },
    play() {
      ui.hideBriefing(true);
      clock.play();
    },
    pause() {
      clock.pause();
    },
    setTerrainMode(modeId) {
      return setTerrainMode(modeId);
    },
    getTelemetry() {
      return {
        time: Number(clock.time.toFixed(2)),
        fps: clock.fpsCounter,
        terrainMode: activeTerrainMode,
        cameraMode: stations.mode,
        cameraStation: activeStation,
        altitudeFt: Math.round(latestState.altitudeFt),
        altitudeM: Math.round(latestState.altitudeM),
        tasMph: Number(latestState.tasMph.toFixed(1)),
        groundSpeedMph: Number(latestState.groundSpeedMph.toFixed(1)),
        windSpeedMph: Number(latestState.windSpeedMph.toFixed(1)),
        headingDeg: Number(latestState.headingDeg.toFixed(1)),
        rollDeg: Number(latestState.rollDeg.toFixed(1)),
        pitchDeg: Number(latestState.pitchDeg.toFixed(1)),
        turnRateDps: Number(latestState.turnRateDps.toFixed(3)),
        coordTurnErrorDps: Number(latestState.coordTurnErrorDps.toFixed(4)),
        gLoad: Number(latestState.gLoad.toFixed(2)),
        slipBallNorm: Number(latestState.slipBallNorm.toFixed(3)),
        slantRangeKm: Number(latestState.slantRangeKm.toFixed(2)),
        bombBayOpenRatio: Number(latestState.bombBayOpenRatio.toFixed(2)),
        bombReleased: latestState.bomb.released,
        bombAltitudeM: Math.round(latestState.bomb.position[1]),
        shock1Time: Number(dynamics.shockwave.shock1Time.toFixed(2)),
        shock2Time: Number(dynamics.shockwave.shock2Time.toFixed(2)),
        cityBuildingCount,
        airframeVertexCount,
        normalAudit,
        audioAudit,
      };
    },
  };
  window.__ENOLA_SIM__ = simApi;
  window.__B29_SIM__ = simApi;

  // Support URL query params (?time=66.6&station=tail_gunner&terrain=compact&autostart=1&clean=1&montage=1&exportVideo=1)
  const isClean = params.get("clean") === "1" || params.get("montage") === "1" || params.get("exportVideo") === "1";
  const isMontage = params.get("montage") === "1";
  const isExportVideo = params.get("exportVideo") === "1";

  if (isClean) {
    pipDirector.setCleanMode(true);
    ui.hideBriefing(true);
  }
  if (params.has("station")) {
    stations.setMode(params.get("station"));
  }
  if (params.has("time")) {
    const initT = parseFloat(params.get("time")) || 0;
    ui.hideBriefing(true);
    clock.seek(initT);
  }
  if (params.get("autostart") === "1") {
    ui.hideBriefing(true);
    clock.play();
  }

  // Deterministic Offline 1920x1080 @ 30fps Batch Frame Export Mode (?exportVideo=1&port=8791)
  if (isExportVideo) {
    const port = parseInt(params.get("port") || "8791", 10);
    const totalFrames = parseInt(params.get("frames") || "1800", 10);
    const fps = 30.0;
    const hudLayer = document.getElementById("hud-layer");
    if (hudLayer) hudLayer.hidden = true;
    pipDirector.pipLayer.hidden = true;

    (async () => {
      await fetch(`http://127.0.0.1:${port}/meta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shock1Time: dynamics.shockwave.shock1Time,
          shock2Time: dynamics.shockwave.shock2Time,
          releaseTime: MISSION_1945.releaseTime,
          detonationTime: MISSION_1945.detonationTime,
        }),
      }).catch(() => {});

      const pendingUploads = new Set();
      for (let i = 0; i < totalFrames; i++) {
        const vidT = i / fps;
        const { m, pipRects } = renderMontageAt(vidT, 1 / fps);
        const comp = pipDirector.compositeCleanFrame(canvas, latestState, m.mainStation, pipRects, vidT);

        const blob = await new Promise((res) => comp.toBlob(res, "image/jpeg", 0.93));
        const p = fetch(`http://127.0.0.1:${port}/frame/${String(i).padStart(4, "0")}`, {
          method: "POST",
          body: blob,
        }).finally(() => pendingUploads.delete(p));
        pendingUploads.add(p);

        if (pendingUploads.size >= 6) {
          await Promise.race(pendingUploads);
        }
      }
      await Promise.all(pendingUploads);
      await fetch(`http://127.0.0.1:${port}/done`, { method: "POST" });
    })();
    return;
  }

  // Live 60s Clean Multi-Angle + PiP Playback Mode (?montage=1)
  if (isMontage) {
    const startPerf = performance.now();
    const initialVidT = parseFloat(params.get("vidTime") || "0");
    if (params.has("vidTime")) {
      renderMontageAt(initialVidT, 1 / 30);
      return;
    }
    function montageLoop(nowMs) {
      requestAnimationFrame(montageLoop);
      const vidT = ((nowMs - startPerf) * 0.001) % 60.0;
      renderMontageAt(vidT, 1 / 30);
    }
    requestAnimationFrame(montageLoop);
    return;
  }

  // Render initial opening background frame behind briefing screen & enable Start button
  renderAt(clock.time, 1 / 30);
  ui.markReady();

  function loop(nowMs) {
    requestAnimationFrame(loop);
    const { shouldRender, dt } = clock.tick(nowMs);
    if (!shouldRender) return;
    renderAt(clock.time, dt);
  }
  requestAnimationFrame(loop);
}

bootstrap().catch((err) => {
  console.error("Failed to initialize B-29 Hiroshima 1945 simulation:", err);
  const btnText = document.getElementById("btn-start-text");
  if (btnText) btnText.textContent = "初始化失败: " + err.message;
});
