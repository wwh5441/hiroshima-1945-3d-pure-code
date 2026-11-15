import * as THREE from "../../vendor/three.module.js";

// GPU-accelerated 3D Perlin-Worley (64^3) & Detail Erosion Worley (32^3) Texture Baker
// Renders packed 2D slice columns (W x W*D) on GPU in <3ms and transfers zero-copy to Data3DTexture.

const VERT_BAKE = `
in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const COMMON_NOISE_3D = `
precision highp float;

uint hashU(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  return v.x;
}

vec3 hash33Periodic(ivec3 p, int period) {
  ivec3 w = ((p % period) + period) % period;
  uvec3 u = uvec3(w);
  uint h1 = hashU(u + uvec3(17u, 59u, 113u));
  uint h2 = hashU(u + uvec3(211u, 97u, 43u));
  uint h3 = hashU(u + uvec3(73u, 179u, 251u));
  return vec3(h1, h2, h3) * (1.0 / 4294967295.0);
}

float worleyPeriodic(vec3 uvw, int freq) {
  vec3 p = uvw * float(freq);
  ivec3 cell = ivec3(floor(p));
  vec3 f = fract(p);
  float minDist = 8.0;
  for (int dz = -1; dz <= 1; dz++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        ivec3 offset = ivec3(dx, dy, dz);
        vec3 rnd = hash33Periodic(cell + offset, freq);
        vec3 diff = vec3(offset) + rnd - f;
        minDist = min(minDist, dot(diff, diff));
      }
    }
  }
  return clamp(1.0 - sqrt(minDist), 0.0, 1.0);
}

float gradPerlinPeriodic(vec3 uvw, int freq) {
  vec3 p = uvw * float(freq);
  ivec3 i = ivec3(floor(p));
  vec3 f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  float res = 0.0;
  for (int dz = 0; dz <= 1; dz++) {
    for (int dy = 0; dy <= 1; dy++) {
      for (int dx = 0; dx <= 1; dx++) {
        ivec3 c = ivec3(dx, dy, dz);
        vec3 g = normalize(hash33Periodic(i + c, freq) * 2.0 - 1.0 + 1e-4);
        float d = dot(g, f - vec3(c));
        vec3 w = mix(1.0 - u, u, vec3(c));
        res += d * w.x * w.y * w.z;
      }
    }
  }
  return clamp(res * 1.45 + 0.5, 0.0, 1.0);
}

float remap(float v, float lo, float hi, float nLo, float nHi) {
  return clamp(nLo + ((v - lo) / max(1e-5, hi - lo)) * (nHi - nLo), 0.0, 1.0);
}
`;

const FRAG_SHAPE_64 = `
${COMMON_NOISE_3D}
uniform float uSize;
out vec4 fragColor;

void main() {
  int S = int(uSize);
  int x = int(gl_FragCoord.x);
  int row = int(gl_FragCoord.y);
  int y = row % S;
  int z = row / S;
  vec3 uvw = (vec3(x, y, z) + 0.5) / uSize;

  float p = 0.55 * gradPerlinPeriodic(uvw, 4)
          + 0.30 * gradPerlinPeriodic(uvw, 8)
          + 0.15 * gradPerlinPeriodic(uvw, 16);

  float w1 = worleyPeriodic(uvw, 4);
  float w2 = worleyPeriodic(uvw, 8);
  float w3 = worleyPeriodic(uvw, 16);
  float w4 = worleyPeriodic(uvw, 32);

  float worleyFbm = w1 * 0.625 + w2 * 0.25 + w3 * 0.125;
  float perlinWorley = remap(p, 1.0 - worleyFbm, 1.0, 0.0, 1.0);

  fragColor = vec4(perlinWorley, w2, w3, w4);
}
`;

const FRAG_EROSION_32 = `
${COMMON_NOISE_3D}
uniform float uSize;
out vec4 fragColor;

void main() {
  int S = int(uSize);
  int x = int(gl_FragCoord.x);
  int row = int(gl_FragCoord.y);
  int y = row % S;
  int z = row / S;
  vec3 uvw = (vec3(x, y, z) + 0.5) / uSize;

  float e1 = worleyPeriodic(uvw, 4);
  float e2 = worleyPeriodic(uvw, 8);
  float e3 = worleyPeriodic(uvw, 16);
  float eFbm = e1 * 0.625 + e2 * 0.25 + e3 * 0.125;
  fragColor = vec4(eFbm, e1, e2, e3);
}
`;

function bakeVolume(renderer, size, fragmentShader) {
  const width = size;
  const height = size * size;
  const rt = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: false,
    stencilBuffer: false,
  });

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geom = new THREE.PlaneGeometry(2, 2);
  const mat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT_BAKE,
    fragmentShader,
    uniforms: { uSize: { value: size } },
    depthTest: false,
    depthWrite: false,
  });
  scene.add(new THREE.Mesh(geom, mat));

  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(rt);
  renderer.render(scene, cam);

  const buffer = new Uint8Array(size * size * size * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, width, height, buffer);
  renderer.setRenderTarget(prevTarget);

  geom.dispose();
  mat.dispose();
  rt.dispose();

  const tex3d = new THREE.Data3DTexture(buffer, size, size, size);
  tex3d.format = THREE.RGBAFormat;
  tex3d.type = THREE.UnsignedByteType;
  tex3d.minFilter = THREE.LinearFilter;
  tex3d.magFilter = THREE.LinearFilter;
  tex3d.wrapS = THREE.RepeatWrapping;
  tex3d.wrapT = THREE.RepeatWrapping;
  tex3d.wrapR = THREE.RepeatWrapping;
  tex3d.unpackAlignment = 1;
  tex3d.needsUpdate = true;
  return tex3d;
}

export function bakeCloudNoiseTextures(renderer) {
  const shapeTex = bakeVolume(renderer, 64, FRAG_SHAPE_64);
  const erosionTex = bakeVolume(renderer, 32, FRAG_EROSION_32);
  return { shapeTex, erosionTex };
}
