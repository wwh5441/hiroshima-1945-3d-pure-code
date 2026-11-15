import * as THREE from "../../vendor/three.module.js";
import { bakeCloudNoiseTextures } from "../atmosphere/noise-baker-3d.js";
import { VOLUMETRIC_CLOUDS_VERT, VOLUMETRIC_CLOUDS_FRAG } from "../atmosphere/volumetric-clouds.glsl.js";
import { DualKawaseBloom } from "../postprocess/dual-kawase-bloom.js";
import { GodRaysTonemapPass } from "../postprocess/godrays-tonemap.js";

// Dual-Frustum RGBA16F HDR Engine:
// Pass 1A: World Terrain & Sky (near=6m, far=140km) -> worldRT (RGBA16F + DepthTexture)
// Pass 1B: Half-Res Volumetric 3D Clouds & Nuclear Mushroom Plume -> cloudRT (RGBA16F)
// Pass 1C: Bilateral Upsample World + Cloud Composite -> hdrCompositeRT (RGBA16F + Depth)
// Pass 2 : Clear Depth ONLY -> B-29 Airframe, Props, Greenhouse Cockpit, Gauges & Crew (near=0.045m, far=28m)
// Pass 3 : 4-Pass Dual-Kawase Bloom + 24-Tap Radial Window Shafts + Flash Adaptation + ACES Tonemap

const BILATERAL_COMPOSITE_FRAG = `
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uWorldTex;
uniform sampler2D uWorldDepth;
uniform sampler2D uCloudTex;
uniform vec2 uCloudTexel;

void main() {
  vec3 worldCol = texture(uWorldTex, vUv).rgb;
  float centerD = texture(uWorldDepth, vUv).r;

  // 3x3 depth-aware bilateral tent filter on half-res volumetric buffer
  vec4 accumCloud = vec4(0.0);
  float wSum = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      vec2 off = vec2(float(dx), float(dy)) * uCloudTexel;
      vec2 suv = clamp(vUv + off, vec2(0.001), vec2(0.999));
      float sd = texture(uWorldDepth, suv).r;
      float wSpatial = (dx == 0 && dy == 0) ? 4.0 : (abs(dx) + abs(dy) == 1 ? 2.0 : 1.0);
      float wDepth = exp(-abs(centerD - sd) * 800.0);
      float w = wSpatial * wDepth;
      accumCloud += texture(uCloudTex, suv) * w;
      wSum += w;
    }
  }
  vec4 cloud = accumCloud / max(1e-4, wSum);
  vec3 outHdr = worldCol * cloud.a + cloud.rgb;
  fragColor = vec4(outHdr, 1.0);
}
`;

export class DualFrustumHdrEngine {
  constructor(canvas, mission, qualityPreset) {
    this.canvas = canvas;
    this.mission = mission;
    this.quality = qualityPreset;

    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      depth: true,
      stencil: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      throw new Error("当前浏览器不支持 WebGL2");
    }

    this.renderer = new THREE.WebGLRenderer({ canvas, context: gl });
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.renderer.debug.onShaderError = (glCtx, prog, vs, fs) => {
      const fLog = glCtx.getShaderInfoLog(fs);
      const vLog = glCtx.getShaderInfoLog(vs);
      console.error("Shader compile error:", { vLog, fLog });
    };

    // Bake 64^3 Perlin-Worley + 32^3 Worley Erosion 3D textures on GPU
    const { shapeTex, erosionTex } = bakeCloudNoiseTextures(this.renderer);
    this.shapeTex = shapeTex;
    this.erosionTex = erosionTex;

    // Bake procedural high-altitude Sky + Sunlit Cumulus + Seto Sea PMREM Environment Map for Alclad duralumin!
    this.envMap = this._bakeProceduralAlcladEnvMap();

    this.worldCamera = new THREE.PerspectiveCamera(58, 16 / 9, 6.0, 140000.0);
    this.cockpitCamera = new THREE.PerspectiveCamera(58, 16 / 9, 0.045, 28.0);

    // Render targets
    const depthTex = new THREE.DepthTexture(4, 4);
    depthTex.type = THREE.UnsignedIntType;

    this.worldRT = new THREE.WebGLRenderTarget(4, 4, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      depthTexture: depthTex,
    });

    this.cloudRT = new THREE.WebGLRenderTarget(4, 4, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });

    this.hdrCompositeRT = new THREE.WebGLRenderTarget(4, 4, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
    });

    // Volumetric Clouds + Mushroom Raymarch Pass
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeom = new THREE.PlaneGeometry(2, 2);

    this.cloudUniforms = {
      uShapeTex: { value: shapeTex },
      uErosionTex: { value: erosionTex },
      uSceneDepthTex: { value: this.worldRT.depthTexture },
      uInvProj: { value: new THREE.Matrix4() },
      uInvView: { value: new THREE.Matrix4() },
      uCamPos: { value: new THREE.Vector3() },
      uNear: { value: 6.0 },
      uFar: { value: 140000.0 },
      uSunDir: { value: new THREE.Vector3(...mission.sunDirection).normalize() },
      uTime: { value: 0 },
      uMaxSteps: { value: qualityPreset.cloudSteps },
      uBurstDt: { value: -1.0 },
      uBurstOrigin: { value: new THREE.Vector3(...mission.burstOrigin) },
      uFlashPower: { value: 0.0 },
      uCloudClearR: { value: 0.0 },
      uWilsonR: { value: 0.0 },
      uWilsonOpacity: { value: 0.0 },
    };

    this.cloudScene = new THREE.Scene();
    this.cloudScene.add(
      new THREE.Mesh(
        quadGeom,
        new THREE.RawShaderMaterial({
          glslVersion: THREE.GLSL3,
          vertexShader: VOLUMETRIC_CLOUDS_VERT,
          fragmentShader: VOLUMETRIC_CLOUDS_FRAG,
          uniforms: this.cloudUniforms,
          depthTest: false,
          depthWrite: false,
        })
      )
    );

    // Bilateral Composite Pass
    this.compUniforms = {
      uWorldTex: { value: this.worldRT.texture },
      uWorldDepth: { value: this.worldRT.depthTexture },
      uCloudTex: { value: this.cloudRT.texture },
      uCloudTexel: { value: new THREE.Vector2(1 / 512, 1 / 288) },
    };
    this.compScene = new THREE.Scene();
    this.compScene.add(
      new THREE.Mesh(
        quadGeom,
        new THREE.RawShaderMaterial({
          glslVersion: THREE.GLSL3,
          vertexShader: VOLUMETRIC_CLOUDS_VERT,
          fragmentShader: BILATERAL_COMPOSITE_FRAG,
          uniforms: this.compUniforms,
          depthTest: false,
          depthWrite: false,
        })
      )
    );

    this.bloom = new DualKawaseBloom();
    this.tonemap = new GodRaysTonemapPass();
    this.sunDir = new THREE.Vector3(...mission.sunDirection).normalize();

    this.resize();
  }

  _bakeProceduralAlcladEnvMap() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext("2d");

    // Equirectangular sky-horizon-cloud-sea bounce gradient
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0.00, "#1c3f7a"); // Deep 31,060-ft stratospheric blue zenith
    g.addColorStop(0.32, "#5b8fd4"); // Upper Rayleigh sky
    g.addColorStop(0.48, "#dce9f8"); // Bright sunlit atmospheric horizon
    g.addColorStop(0.54, "#e8e4dc"); // Sunlit cumulus cloud deck under-reflection
    g.addColorStop(0.72, "#5c758c"); // Seto Inland Sea & basin haze bounce
    g.addColorStop(1.00, "#3b4c58"); // Nadir sea/land bounce (eliminates black underside on metallic wings!)
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);

    // Warm morning Eastern solar specular lobe
    const sunG = ctx.createRadialGradient(68, 44, 2, 68, 44, 42);
    sunG.addColorStop(0.0, "rgba(255, 250, 232, 0.95)");
    sunG.addColorStop(0.4, "rgba(255, 236, 198, 0.35)");
    sunG.addColorStop(1.0, "rgba(255, 236, 198, 0.0)");
    ctx.fillStyle = sunG;
    ctx.fillRect(0, 0, 256, 128);

    const eqTex = new THREE.CanvasTexture(c);
    eqTex.mapping = THREE.EquirectangularReflectionMapping;
    eqTex.colorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    const envRT = pmrem.fromEquirectangular(eqTex);
    eqTex.dispose();
    pmrem.dispose();
    return envRT.texture;
  }

  setQuality(preset) {
    this.quality = preset;
    this.cloudUniforms.uMaxSteps.value = preset.cloudSteps;
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality.pixelRatioCap);
    const cssW = Math.max(2, window.innerWidth);
    const cssH = Math.max(2, window.innerHeight);
    const w = Math.max(2, Math.floor(cssW * dpr));
    const h = Math.max(2, Math.floor(cssH * dpr));
    this._fullSize = { cssW, cssH, dpr, w, h };

    this.renderer.setSize(cssW, cssH, false);
    this.renderer.setPixelRatio(dpr);

    const aspect = cssW / Math.max(1, cssH);
    this.worldCamera.aspect = aspect;
    this.worldCamera.updateProjectionMatrix();
    this.cockpitCamera.aspect = aspect;
    this.cockpitCamera.updateProjectionMatrix();

    this.worldRT.setSize(w, h);
    this.hdrCompositeRT.setSize(w, h);

    const cw = Math.max(2, Math.floor(w * this.quality.cloudScale));
    const ch = Math.max(2, Math.floor(h * this.quality.cloudScale));
    this.cloudRT.setSize(cw, ch);
    this.compUniforms.uCloudTexel.value.set(1.0 / cw, 1.0 / ch);

    this.bloom.setSize(w, h);
  }

  // Optional viewportRect in CSS pixels (bottom-left WebGL Y origin): { x, y, w, h }
  renderFrame(worldScene, cockpitScene, flightState, headPose, viewportRect = null) {
    const full = this._fullSize || { cssW: window.innerWidth, cssH: window.innerHeight };
    const aspect = viewportRect
      ? viewportRect.w / Math.max(1, viewportRect.h)
      : full.cssW / Math.max(1, full.cssH);

    // Synchronize Dual-Frustum Cameras:
    // Cockpit camera sits in Aircraft Local Space; World camera sits in World Space!
    this.cockpitCamera.aspect = aspect;
    this.cockpitCamera.fov = headPose.fov;
    this.cockpitCamera.near = headPose.nearCockpit ?? 0.045;
    this.cockpitCamera.far = headPose.farCockpit ?? 52.0;
    this.cockpitCamera.updateProjectionMatrix();
    this.cockpitCamera.position.copy(headPose.localEye);
    this.cockpitCamera.quaternion.copy(headPose.localHeadQuat);
    this.cockpitCamera.updateMatrixWorld(true);

    this.worldCamera.aspect = aspect;
    this.worldCamera.fov = headPose.fov;
    this.worldCamera.updateProjectionMatrix();
    const worldEye = headPose.localEye
      .clone()
      .applyQuaternion(flightState.quaternion)
      .add(new THREE.Vector3(...flightState.position));
    this.worldCamera.position.copy(worldEye);
    this.worldCamera.quaternion.multiplyQuaternions(flightState.quaternion, headPose.localHeadQuat);
    this.worldCamera.updateMatrixWorld(true);

    // Pass 1A: World Terrain & Sky -> worldRT
    this.renderer.setRenderTarget(this.worldRT);
    this.renderer.clear(true, true, false);
    this.renderer.render(worldScene, this.worldCamera);

    // Pass 1B: Volumetric 3D Clouds & Nuclear Mushroom Plume -> cloudRT
    const cu = this.cloudUniforms;
    cu.uInvProj.value.copy(this.worldCamera.projectionMatrixInverse);
    cu.uInvView.value.copy(this.worldCamera.matrixWorld);
    cu.uCamPos.value.copy(this.worldCamera.position);
    cu.uTime.value = flightState.time;
    if (flightState.shock.active) {
      cu.uBurstDt.value = flightState.shock.dt;
      cu.uFlashPower.value = flightState.shock.flashIntensity;
      cu.uCloudClearR.value = flightState.shock.cloudClearRadius;
      cu.uWilsonR.value = flightState.shock.wilsonRadius;
      cu.uWilsonOpacity.value = flightState.shock.wilsonOpacity;
    } else {
      cu.uBurstDt.value = -1.0;
      cu.uFlashPower.value = 0.0;
      cu.uCloudClearR.value = 0.0;
      cu.uWilsonR.value = 0.0;
      cu.uWilsonOpacity.value = 0.0;
    }
    this.renderer.setRenderTarget(this.cloudRT);
    this.renderer.clear(true, false, false);
    this.renderer.render(this.cloudScene, this.quadCam);

    // Pass 1C: Bilateral Upsample World + Clouds -> hdrCompositeRT
    this.renderer.setRenderTarget(this.hdrCompositeRT);
    this.renderer.clear(true, true, false);
    this.renderer.render(this.compScene, this.quadCam);

    // Pass 2: Clear Depth ONLY -> Render B-29 Airframe & Greenhouse Cockpit at sub-mm precision!
    this.renderer.clearDepth();
    this.renderer.render(cockpitScene, this.cockpitCamera);

    // Pass 3: 4-Pass Dual-Kawase HDR Bloom + Radial Window Shafts + ACES Tonemap -> Screen (or PiP Viewport!)
    const bloomTex = this.bloom.render(this.renderer, this.hdrCompositeRT.texture);
    this.tonemap.render(
      this.renderer,
      this.hdrCompositeRT.texture,
      bloomTex,
      this.worldCamera,
      this.sunDir,
      this.mission.burstOrigin,
      flightState,
      viewportRect,
      this._fullSize
    );
  }
}
