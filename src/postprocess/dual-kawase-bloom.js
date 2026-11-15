import * as THREE from "../../vendor/three.module.js";

// 4-Pass HDR Dual-Kawase Bloom (SR-71 Airsup Lab / SIGGRAPH 2015 Marius Bjørge Architecture)

const QUAD_VERT = `
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const PREFILTER_FRAG = `
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform float uThreshold;

void main() {
  vec3 c = texture(uTex, vUv).rgb;
  // Clamp fireflies
  c = min(c, vec3(32.0));
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp((br - uThreshold + 0.5) / 1.0, 0.0, 1.0);
  float contrib = max(soft * soft * 0.25, br - uThreshold) / max(br, 1e-4);
  fragColor = vec4(c * max(0.0, contrib), 1.0);
}
`;

const DOWNSAMPLE_FRAG = `
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform vec2 uHalfPixel;

void main() {
  vec3 sum = texture(uTex, vUv).rgb * 4.0;
  sum += texture(uTex, vUv - uHalfPixel).rgb;
  sum += texture(uTex, vUv + uHalfPixel).rgb;
  sum += texture(uTex, vUv + vec2(uHalfPixel.x, -uHalfPixel.y)).rgb;
  sum += texture(uTex, vUv - vec2(uHalfPixel.x, -uHalfPixel.y)).rgb;
  fragColor = vec4(sum / 8.0, 1.0);
}
`;

const UPSAMPLE_FRAG = `
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform vec2 uHalfPixel;

void main() {
  vec3 sum = vec3(0.0);
  sum += texture(uTex, vUv + vec2(-uHalfPixel.x * 2.0, 0.0)).rgb;
  sum += texture(uTex, vUv + vec2(-uHalfPixel.x, uHalfPixel.y)).rgb * 2.0;
  sum += texture(uTex, vUv + vec2(0.0, uHalfPixel.y * 2.0)).rgb;
  sum += texture(uTex, vUv + vec2(uHalfPixel.x, uHalfPixel.y)).rgb * 2.0;
  sum += texture(uTex, vUv + vec2(uHalfPixel.x * 2.0, 0.0)).rgb;
  sum += texture(uTex, vUv + vec2(uHalfPixel.x, -uHalfPixel.y)).rgb * 2.0;
  sum += texture(uTex, vUv + vec2(0.0, -uHalfPixel.y * 2.0)).rgb;
  sum += texture(uTex, vUv + vec2(-uHalfPixel.x, -uHalfPixel.y)).rgb * 2.0;
  fragColor = vec4(sum / 12.0, 1.0);
}
`;

function makeHdrRT(w, h) {
  return new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
  });
}

export class DualKawaseBloom {
  constructor() {
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.scene.add(this.quad);

    this.prefilterMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: QUAD_VERT,
      fragmentShader: PREFILTER_FRAG,
      uniforms: { uTex: { value: null }, uThreshold: { value: 1.15 } },
      depthTest: false,
      depthWrite: false,
    });

    this.downMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: QUAD_VERT,
      fragmentShader: DOWNSAMPLE_FRAG,
      uniforms: { uTex: { value: null }, uHalfPixel: { value: new THREE.Vector2() } },
      depthTest: false,
      depthWrite: false,
    });

    this.upMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: QUAD_VERT,
      fragmentShader: UPSAMPLE_FRAG,
      uniforms: { uTex: { value: null }, uHalfPixel: { value: new THREE.Vector2() } },
      depthTest: false,
      depthWrite: false,
    });

    this.rtsDown = [makeHdrRT(4, 4), makeHdrRT(4, 4), makeHdrRT(4, 4)];
    this.rtsUp = [makeHdrRT(4, 4), makeHdrRT(4, 4)];
  }

  setSize(w, h) {
    this.rtsDown[0].setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
    this.rtsDown[1].setSize(Math.max(2, w >> 2), Math.max(2, h >> 2));
    this.rtsDown[2].setSize(Math.max(2, w >> 3), Math.max(2, h >> 3));
    this.rtsUp[0].setSize(Math.max(2, w >> 2), Math.max(2, h >> 2));
    this.rtsUp[1].setSize(Math.max(2, w >> 1), Math.max(2, h >> 1));
  }

  render(renderer, inputTex) {
    // 1. Threshold prefilter -> half res
    this.quad.material = this.prefilterMat;
    this.prefilterMat.uniforms.uTex.value = inputTex;
    renderer.setRenderTarget(this.rtsDown[0]);
    renderer.render(this.scene, this.cam);

    // 2. Kawase Downsample x2 -> x4 -> x8
    this.quad.material = this.downMat;
    for (let i = 0; i < 2; i++) {
      const src = this.rtsDown[i];
      const dst = this.rtsDown[i + 1];
      this.downMat.uniforms.uTex.value = src.texture;
      this.downMat.uniforms.uHalfPixel.value.set(0.5 / src.width, 0.5 / src.height);
      renderer.setRenderTarget(dst);
      renderer.render(this.scene, this.cam);
    }

    // 3. Kawase Upsample x8 -> x4 -> x2
    this.quad.material = this.upMat;
    this.upMat.uniforms.uTex.value = this.rtsDown[2].texture;
    this.upMat.uniforms.uHalfPixel.value.set(0.5 / this.rtsDown[2].width, 0.5 / this.rtsDown[2].height);
    renderer.setRenderTarget(this.rtsUp[0]);
    renderer.render(this.scene, this.cam);

    this.upMat.uniforms.uTex.value = this.rtsUp[0].texture;
    this.upMat.uniforms.uHalfPixel.value.set(0.5 / this.rtsUp[0].width, 0.5 / this.rtsUp[0].height);
    renderer.setRenderTarget(this.rtsUp[1]);
    renderer.render(this.scene, this.cam);

    return this.rtsUp[1].texture;
  }
}
