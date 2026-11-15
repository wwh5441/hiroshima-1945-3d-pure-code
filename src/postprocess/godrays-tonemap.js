import * as THREE from "../../vendor/three.module.js";

// 28-Tap Screen-Space Radial God Rays (Sun & Nuclear Flash Shafts through Greenhouse Frames)
// + Retinal Flash-Blindness Exposure Adaptation + ACES Filmic Tone Mapping + Shockwave Chromatic Shift

const FINAL_VERT = `
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FINAL_FRAG = `
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uHdrTex;
uniform sampler2D uBloomTex;

uniform vec2 uSunScreenPos;
uniform float uSunRayWeight;
uniform vec2 uBurstScreenPos;
uniform float uBurstRayWeight;

uniform float uExposure;
uniform float uWhiteout;
uniform float uChromaticShift;
uniform float uTime;

vec3 acesFilmic(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

vec3 traceRadialShafts(vec2 uv, vec2 lightPos, float weight) {
  if (weight <= 0.002) return vec3(0.0);
  vec2 delta = (uv - lightPos) * (0.82 / 24.0);
  vec2 tc = uv;
  vec3 accum = vec3(0.0);
  float decay = 1.0;
  for (int i = 0; i < 24; i++) {
    tc -= delta;
    vec2 clampedTc = clamp(tc, vec2(0.002), vec2(0.998));
    vec3 s = min(texture(uBloomTex, clampedTc).rgb, vec3(8.0));
    accum += s * decay;
    decay *= 0.935;
  }
  return accum * (weight / 24.0);
}

void main() {
  // Subtle chromatic shockwave aberration when primary/reflected blast waves slam the cockpit
  vec2 caOffset = (vUv - 0.5) * uChromaticShift;
  vec3 hdr;
  hdr.r = texture(uHdrTex, vUv + caOffset).r;
  hdr.g = texture(uHdrTex, vUv).g;
  hdr.b = texture(uHdrTex, vUv - caOffset).b;

  vec3 bloom = texture(uBloomTex, vUv).rgb;

  // Screen-space radial light shafts through B-29 greenhouse ribs!
  vec3 sunShafts = traceRadialShafts(vUv, uSunScreenPos, uSunRayWeight);
  vec3 burstShafts = traceRadialShafts(vUv, uBurstScreenPos, uBurstRayWeight);

  vec3 combined = hdr + bloom * 0.28 + sunShafts + burstShafts;
  combined *= uExposure;

  vec3 mapped = acesFilmic(combined);

  // Brief retinal dazzle veil at exact 580m airburst thermal flash peak
  mapped = mix(mapped, vec3(1.0, 0.985, 0.94), clamp(uWhiteout, 0.0, 0.92));

  // Subtle cinema vignette & archival 35mm grain
  float distCenter = length(vUv - 0.5);
  mapped *= 1.0 - 0.22 * distCenter * distCenter;

  float grain = fract(sin(dot(vUv * vec2(1280.0, 720.0) + uTime * 37.0, vec2(12.9898, 78.233))) * 43758.5453);
  mapped += (grain - 0.5) * 0.012;

  // Linear -> sRGB gamma
  mapped = pow(max(mapped, vec3(0.0)), vec3(1.0 / 2.2));
  fragColor = vec4(mapped, 1.0);
}
`;

export class GodRaysTonemapPass {
  constructor() {
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.uniforms = {
      uHdrTex: { value: null },
      uBloomTex: { value: null },
      uSunScreenPos: { value: new THREE.Vector2(0.5, 0.5) },
      uSunRayWeight: { value: 0.0 },
      uBurstScreenPos: { value: new THREE.Vector2(0.5, 0.5) },
      uBurstRayWeight: { value: 0.0 },
      uExposure: { value: 0.78 },
      uWhiteout: { value: 0.0 },
      uChromaticShift: { value: 0.0 },
      uTime: { value: 0.0 },
    };

    this.mat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FINAL_VERT,
      fragmentShader: FINAL_FRAG,
      uniforms: this.uniforms,
      depthTest: false,
      depthWrite: false,
    });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat));
    this._projVec = new THREE.Vector3();
  }

  _projectDirectionToUv(worldTargetPos, camera) {
    this._projVec.copy(worldTargetPos).project(camera);
    const inFront = this._projVec.z < 1.0;
    const u = this._projVec.x * 0.5 + 0.5;
    const v = this._projVec.y * 0.5 + 0.5;
    const offscreenDist = Math.hypot(Math.max(0, Math.abs(u - 0.5) - 0.5), Math.max(0, Math.abs(v - 0.5) - 0.5));
    const fade = inFront ? Math.max(0, 1.0 - offscreenDist * 2.2) : 0.0;
    return { u, v, fade };
  }

  render(renderer, hdrTex, bloomTex, camera, sunDir, burstOrigin, flightState, viewportRect = null, fullSize = null) {
    this.uniforms.uHdrTex.value = hdrTex;
    this.uniforms.uBloomTex.value = bloomTex;
    this.uniforms.uTime.value = flightState.time;

    // Project Sun into screen UV for cockpit window God Rays
    const sunWorld = new THREE.Vector3()
      .copy(sunDir)
      .multiplyScalar(80000)
      .add(camera.position);
    const sProj = this._projectDirectionToUv(sunWorld, camera);
    this.uniforms.uSunScreenPos.value.set(sProj.u, sProj.v);
    this.uniforms.uSunRayWeight.value = 0.24 * sProj.fade;

    // Project Nuclear Fireball into screen UV for blinding window shafts + retinal adaptation
    if (flightState.shock.active) {
      const dt = flightState.shock.dt;
      const flash = flightState.shock.flashIntensity;
      const bWorld = new THREE.Vector3(burstOrigin[0], burstOrigin[1] + Math.min(3500, dt * 75), burstOrigin[2]);
      const bProj = this._projectDirectionToUv(bWorld, camera);
      this.uniforms.uBurstScreenPos.value.set(bProj.u, bProj.v);
      this.uniforms.uBurstRayWeight.value = Math.min(0.85, (flash * 0.45 + 0.22 * Math.exp(-dt * 0.04)) * bProj.fade);

      // Photochemical / human iris dazzle: initial whiteout spike followed by dark-iris recovery
      this.uniforms.uWhiteout.value = Math.min(0.74, Math.pow(Math.max(0, flash - 0.55), 1.3) * 0.34);
      const irisStopDown = 1.0 / (1.0 + flash * 0.42 + 0.28 * Math.exp(-dt * 0.35));
      this.uniforms.uExposure.value = 0.78 * irisStopDown;
    } else {
      this.uniforms.uBurstRayWeight.value = 0.0;
      this.uniforms.uWhiteout.value = 0.0;
      this.uniforms.uExposure.value = 0.78;
    }

    const shakeMag = Math.hypot(...flightState.shock.cockpitShake);
    this.uniforms.uChromaticShift.value = Math.min(0.014, shakeMag * 0.16);

    renderer.setRenderTarget(null);
    if (viewportRect && fullSize) {
      renderer.setViewport(viewportRect.x, viewportRect.y, viewportRect.w, viewportRect.h);
      renderer.setScissor(viewportRect.x, viewportRect.y, viewportRect.w, viewportRect.h);
      renderer.setScissorTest(true);
      renderer.render(this.scene, this.cam);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, fullSize.cssW, fullSize.cssH);
    } else {
      renderer.setScissorTest(false);
      if (fullSize) {
        renderer.setViewport(0, 0, fullSize.cssW, fullSize.cssH);
      }
      renderer.render(this.scene, this.cam);
    }
  }
}
