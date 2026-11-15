import * as THREE from "../../vendor/three.module.js";
import { SKY_SCATTERING_GLSL } from "../atmosphere/sky-scattering.glsl.js";
import { HIROSHIMA_GEO } from "../../data/hiroshima-geo.js";
import { getHiroshimaDemArrays } from "../../data/hiroshima-dem-1945.js";

// Real-World Satellite DEM Hiroshima 1945 Terrain, Authentic Pre-Reclamation Wartime Coastline,
// 7-Branch Ota River Delta, Hiroshima Castle Moat, Chugoku Mountain Ridges & Seto Inland Sea Archipelago!

function packDemToRgbaTexture(floatData, size) {
  const rgba = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const q = Math.max(0, Math.min(65535, Math.round(floatData[i] * 20.0))); // 0.05m vertical precision!
    rgba[i * 4] = (q >> 8) & 0xff;
    rgba[i * 4 + 1] = q & 0xff;
    rgba[i * 4 + 2] = 0;
    rgba[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(rgba, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.flipY = false;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function buildGeoGlsl(geo, demMeta) {
  const rivLines = [];
  for (const r of geo.rivers) {
    const halfW = (r.width * 0.5).toFixed(1);
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, az] = r.pts[i];
      const [bx, bz] = r.pts[i + 1];
      rivLines.push(
        `  d = min(d, segDist(p, vec2(${ax.toFixed(1)}, ${az.toFixed(1)}), vec2(${bx.toFixed(1)}, ${bz.toFixed(1)})) - ${halfW});`
      );
    }
  }

  const cm = geo.castleMoat;
  const moatGlsl = `
float castleMoatSdf(vec2 p) {
  vec2 q = abs(p - vec2(${cm.cx.toFixed(1)}, ${cm.cz.toFixed(1)}));
  float outerBox = max(q.x - ${cm.halfW.toFixed(1)}, q.y - ${cm.halfD.toFixed(1)});
  float innerBox = max(q.x - ${(cm.halfW - cm.moatWidth).toFixed(1)}, q.y - ${(cm.halfD - cm.moatWidth).toFixed(1)});
  return max(outerBox, -innerBox);
}
`;

  const regHalf = demMeta.regional.halfSpanM.toFixed(1);
  const urbHalf = demMeta.urban.halfSpanM.toFixed(1);

  return {
    elevationGlsl: `
uniform sampler2D uRegionalDemTex;
uniform sampler2D uUrbanDemTex;
uniform int uRegionalGridN;
uniform int uUrbanGridN;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbmMountain(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(13.7, 7.3);
    a *= 0.5;
  }
  return s;
}

float fetchPackedDem(sampler2D tex, ivec2 ij) {
  vec4 t = texelFetch(tex, ij, 0);
  return (floor(t.r * 255.0 + 0.5) * 256.0 + floor(t.g * 255.0 + 0.5)) * 0.05;
}

float samplePackedGrid(sampler2D tex, int gridN, float halfSpan, vec2 xz) {
  vec2 uv = (xz + halfSpan) / (2.0 * halfSpan);
  vec2 f = clamp(uv, 0.0, 1.0) * float(gridN - 1);
  ivec2 i0 = ivec2(floor(f));
  i0 = clamp(i0, ivec2(0), ivec2(gridN - 2));
  vec2 t = f - vec2(i0);
  float h00 = fetchPackedDem(tex, i0);
  float h10 = fetchPackedDem(tex, i0 + ivec2(1, 0));
  float h01 = fetchPackedDem(tex, i0 + ivec2(0, 1));
  float h11 = fetchPackedDem(tex, i0 + ivec2(1, 1));
  return mix(mix(h00, h10, t.x), mix(h01, h11, t.x), t.y);
}

float terrainElevation(vec2 xz) {
  float maxAbs = max(abs(xz.x), abs(xz.y));

  // Beyond 30 km satellite DEM tile boundary: blend smoothly into outer Chugoku mountains (North) & Seto Sea (South)
  float outerLand = 1.0 - smoothstep(2000.0, 9500.0, xz.y + 2200.0 * sin(xz.x * 0.00012));
  float outerMtn = outerLand * (95.0 + 580.0 * pow(fbmMountain(xz * 0.00022), 1.45));

  if (maxAbs >= ${regHalf}) {
    return outerMtn;
  }

  float hDem;
  if (maxAbs < ${urbHalf} - 500.0) {
    hDem = samplePackedGrid(uUrbanDemTex, uUrbanGridN, ${urbHalf}, xz);
  } else if (maxAbs < ${urbHalf}) {
    float hUrb = samplePackedGrid(uUrbanDemTex, uUrbanGridN, ${urbHalf}, xz);
    float hReg = samplePackedGrid(uRegionalDemTex, uRegionalGridN, ${regHalf}, xz);
    float w = (${urbHalf} - maxAbs) / 500.0;
    hDem = mix(hReg, hUrb, w);
  } else {
    hDem = samplePackedGrid(uRegionalDemTex, uRegionalGridN, ${regHalf}, xz);
  }

  // Add subtle natural dendritic ridge & forest canopy micro-relief on mountain slopes (> 16m)
  float slopeRelief = smoothstep(14.0, 85.0, hDem) * ((fbmMountain(xz * 0.0032) - 0.48) * 11.0);
  float hFinal = max(0.0, hDem + slopeRelief);

  // Smoothly feather outer 26km..30km border into distant Chugoku horizon
  float borderBlend = smoothstep(${regHalf} - 4200.0, ${regHalf}, maxAbs);
  return mix(hFinal, outerMtn, borderBlend);
}
`,
    riverGlsl: `
float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(1e-4, dot(ba, ba)), 0.0, 1.0);
  return length(pa - ba * h);
}

float riverSdf(vec2 p) {
  float d = 1e6;
${rivLines.join("\n")}
  return d;
}
${moatGlsl}
`,
  };
}

export function createHiroshimaTerrain(mission, geo = HIROSHIMA_GEO, initialDemArrays = null) {
  let activeDem = initialDemArrays || getHiroshimaDemArrays();
  let regionalDemTex = packDemToRgbaTexture(activeDem.regional.data, activeDem.regional.size);
  let urbanDemTex = packDemToRgbaTexture(activeDem.urban.data, activeDem.urban.size);

  const { elevationGlsl, riverGlsl } = buildGeoGlsl(geo, activeDem);

  const TERRAIN_VERT = `
uniform float uEarthRadius;
uniform vec2 uFocusCenter;

out vec3 vWorldPos;
out vec2 vMapXZ;

${elevationGlsl}

void main() {
  vec2 grid = position.xz;
  float rNorm = length(grid);
  vec2 dir = rNorm > 1e-5 ? grid / rNorm : vec2(0.0);
  float warpedR = 108000.0 * (exp(2.85 * rNorm) - 1.0) / (exp(2.85) - 1.0);
  vec2 worldXZ = uFocusCenter + dir * warpedR;

  float elev = terrainElevation(worldXZ);
  float distCamXZ = length(worldXZ - cameraPosition.xz);
  float earthDrop = (distCamXZ * distCamXZ) / (2.0 * uEarthRadius);

  vec3 wp = vec3(worldXZ.x, elev - earthDrop, worldXZ.y);
  vWorldPos = wp;
  vMapXZ = worldXZ;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

  const TERRAIN_FRAG = `
precision highp float;

in vec3 vWorldPos;
in vec2 vMapXZ;
out vec4 fragColor;

uniform vec3 uSunDir;
uniform float uTime;
uniform float uBurstDt;
uniform vec3 uBurstOrigin;
uniform float uFlashPower;
uniform float uGroundWaveR;

${SKY_SCATTERING_GLSL}
${elevationGlsl}
${riverGlsl}

void main() {
  vec2 xz = vMapXZ;
  vec3 viewVec = vWorldPos - cameraPosition;
  float dist = length(viewVec);
  vec3 rayDir = viewVec / max(1e-3, dist);

  // Per-pixel real satellite DEM elevation + fine gradient normal for sharp valleys, coves & mountain ridges!
  float elev = terrainElevation(xz);
  float eps = 24.0;
  float hL = terrainElevation(xz - vec2(eps, 0.0));
  float hR = terrainElevation(xz + vec2(eps, 0.0));
  float hD = terrainElevation(xz - vec2(0.0, eps));
  float hU = terrainElevation(xz + vec2(0.0, eps));
  float microX = (vnoise(xz * 0.014 + vec2(3.1, 0.0)) - vnoise(xz * 0.014 - vec2(3.1, 0.0))) * 6.5;
  float microZ = (vnoise(xz * 0.014 + vec2(0.0, 3.1)) - vnoise(xz * 0.014 - vec2(0.0, 3.1))) * 6.5;
  float slopeMask = smoothstep(8.0, 48.0, elev);
  vec3 nrm = normalize(vec3(
    -(hR - hL) - microX * slopeMask,
    2.0 * eps,
    -(hU - hD) - microZ * slopeMask
  ));

  float rDist = riverSdf(xz);
  float moatDist = castleMoatSdf(xz);
  // Real DEM shoreline: sea & bay everywhere DEM <= 0.42m along 1945 Hiroshima Bay coast, plus exact 7 Ota channels & Castle moat!
  bool inSeaOrBay = (elev <= 0.42) && (xz.y > 2480.0 || (xz.x < -2420.0 && xz.y > 920.0));
  bool inRiver = (rDist < 0.0) && (elev < 22.0);
  bool inMoat = (moatDist < 0.0) && (elev < 12.0);
  bool isWater = inSeaOrBay || inRiver || inMoat;

  vec3 surfColor;
  if (isWater) {
    nrm = normalize(vec3(
      0.014 * sin(xz.x * 0.055 + uTime * 1.4),
      1.0,
      0.014 * cos(xz.y * 0.055 - uTime * 1.1)
    ));
    vec3 viewToCam = -rayDir;
    float fresnel = 0.03 + 0.97 * pow(1.0 - max(0.0, dot(nrm, viewToCam)), 5.0);
    // Subtle turquoise-slate littoral shoals near 1945 delta beaches & islands
    float shoal = (1.0 - smoothstep(0.0, 0.52, elev)) * 0.35;
    vec3 deepSea = inMoat
      ? vec3(0.036, 0.082, 0.072)
      : (inRiver ? vec3(0.035, 0.082, 0.105) : mix(vec3(0.020, 0.058, 0.102), vec3(0.042, 0.105, 0.125), shoal));
    vec3 skyReflect = vec3(0.44, 0.60, 0.80);
    vec3 halfV = normalize(uSunDir + viewToCam);
    float sunGlint = pow(max(0.0, dot(nrm, halfV)), 210.0) * 4.8;
    surfColor = mix(deepSea, skyReflect, fresnel * 0.76) + vec3(1.4, 1.22, 0.95) * sunGlint;

    if (uBurstDt > 0.0) {
      vec3 fbPos = vec3(uBurstOrigin.x, uBurstOrigin.y + min(4500.0, uBurstDt * 95.0), uBurstOrigin.z);
      vec3 lFB = normalize(fbPos - vWorldPos);
      vec3 hFB = normalize(lFB + viewToCam);
      float fbSpec = pow(max(0.0, dot(nrm, hFB)), 48.0);
      surfColor += vec3(3.2, 1.4, 0.45) * fbSpec * (uFlashPower * 2.5 + exp(-uBurstDt * 0.04) * 1.8);
    }
  } else {
    float slopeSteep = 1.0 - nrm.y;
    // Organic 1945 urban footprint following flat delta islands, Ujina corridor, Danbara, Koi & Yokogawa valleys!
    float urbanNoise = (fbmMountain(xz * 0.0012 + vec2(1.9, 5.4)) - 0.5) * 850.0;
    float coreEnv = 1.0 - smoothstep(2350.0, 4450.0, length((xz - vec2(120.0, 520.0)) * vec2(0.82, 0.86)) + urbanNoise);
    float valleyEnv = exp(-pow((xz.x + 320.0 - xz.y * 0.12) / 950.0, 2.0)) * smoothstep(-6200.0, -1200.0, xz.y);
    float urbanMask = clamp(coreEnv + valleyEnv * 0.75, 0.0, 1.0)
      * (1.0 - smoothstep(7.5, 28.0, elev))
      * (1.0 - smoothstep(0.06, 0.18, slopeSteep));

    vec2 rotXZ = mat2(0.992, -0.125, 0.125, 0.992) * xz;
    vec2 majorGrid = abs(fract(rotXZ / 210.0) - 0.5);
    vec2 minorGrid = abs(fract(rotXZ / 52.5) - 0.5);
    float majorRoad = 1.0 - smoothstep(0.022, 0.048, min(majorGrid.x, majorGrid.y));
    float minorRoad = 1.0 - smoothstep(0.032, 0.075, min(minorGrid.x, minorGrid.y));

    float aioiDori = 1.0 - smoothstep(11.0, 20.0, abs(xz.y - (-138.0 + (xz.x + 190.0) * 0.062)));
    // 1945 Cleared East-West Firebreak Boulevard (Tsurumi-Zakoba-Funairi at z ~ +540m)
    float firebreak1945 = (1.0 - smoothstep(28.0, 44.0, abs(xz.y - 540.0))) * (1.0 - smoothstep(1600.0, 2100.0, abs(xz.x)));
    float sandBank = (1.0 - smoothstep(0.0, 20.0, rDist)) * step(0.0, rDist);
    float coastalBeach = 1.0 - smoothstep(0.55, 1.85, elev);
    float paradeGround = 1.0 - smoothstep(160.0, 210.0, max(abs(xz.x + 120.0), abs(xz.y + 620.0)));

    float lotVar = vnoise(floor(rotXZ / 24.0) * 1.9);
    vec3 blockGround = mix(vec3(0.165, 0.155, 0.138), vec3(0.225, 0.205, 0.178), lotVar);
    vec3 streetPale = vec3(0.32, 0.30, 0.26);
    vec3 cityAlbedo = mix(
      blockGround,
      streetPale,
      clamp(majorRoad * 0.78 + minorRoad * 0.38 + aioiDori * 0.85 + firebreak1945 * 0.72, 0.0, 0.90)
    );
    cityAlbedo = mix(
      cityAlbedo,
      vec3(0.36, 0.33, 0.27),
      clamp(sandBank * 0.65 + paradeGround * 0.55 + coastalBeach * 0.55, 0.0, 0.80)
    );

    // Sanyo Main Line railway curving through Hiroshima Station -> Yokogawa -> Koi
    float railDist = abs(xz.y - (-1380.0 + 360.0 * sin((xz.x - 600.0) * 0.00038)));
    cityAlbedo = mix(cityAlbedo, vec3(0.15, 0.14, 0.135), (1.0 - smoothstep(6.0, 15.0, railDist)) * 0.75 * urbanMask);

    // Rich Chugoku Japanese red-pine/cedar mountain forests, valley rice paddies & granite cliff outcrops!
    float forestTex = vnoise(xz * 0.0085) * 0.58 + vnoise(xz * 0.034) * 0.42;
    vec3 deepPine = vec3(0.042, 0.092, 0.040);
    vec3 sunlitCedar = vec3(0.095, 0.148, 0.060);
    vec3 forestAlbedo = mix(deepPine, sunlitCedar, forestTex);
    // Exposed Seto granite / weathered soil on steep Chugoku mountain ridges
    vec3 graniteRidge = vec3(0.23, 0.21, 0.185);
    forestAlbedo = mix(forestAlbedo, graniteRidge, smoothstep(0.18, 0.42, slopeSteep) * 0.58);

    float paddyFieldPatch = vnoise(floor(rotXZ / 64.0) * 2.3);
    float paddyMask = (1.0 - urbanMask * 0.88)
      * (1.0 - smoothstep(4.5, 42.0, elev + (forestTex - 0.5) * 10.0))
      * (1.0 - smoothstep(0.04, 0.12, slopeSteep));
    vec3 paddyAlbedo = mix(vec3(0.096, 0.156, 0.068), vec3(0.152, 0.200, 0.088), paddyFieldPatch);
    vec3 ruralAlbedo = mix(forestAlbedo, paddyAlbedo, paddyMask * 0.76);
    ruralAlbedo = mix(ruralAlbedo, vec3(0.35, 0.32, 0.26), coastalBeach * 0.65);

    vec3 landAlbedo = mix(ruralAlbedo, cityAlbedo, urbanMask);

    vec3 groundEmission = vec3(0.0);
    if (uBurstDt > 0.0) {
      float dGround = length(xz - uBurstOrigin.xz);
      float blastFront = min(uGroundWaveR, 6200.0);
      float scorched = (1.0 - smoothstep(blastFront * 0.50, blastFront + 90.0, dGround)) * (1.0 - smoothstep(1600.0, 3200.0, dGround));
      landAlbedo = mix(landAlbedo, vec3(0.052, 0.044, 0.040), scorched * 0.88);

      float dustRing = exp(-pow((dGround - uGroundWaveR) / 210.0, 2.0)) * smoothstep(6800.0, 600.0, uGroundWaveR);
      landAlbedo = mix(landAlbedo, vec3(0.56, 0.49, 0.40), clamp(dustRing * 0.92, 0.0, 0.88));

      float emberNoise = vnoise(xz * 0.024 + vec2(uTime * 0.08, 0.0));
      float fireZone = (1.0 - smoothstep(500.0, 1950.0, dGround)) * smoothstep(1.2, 8.0, uBurstDt) * urbanMask;
      groundEmission += vec3(2.4, 0.55, 0.08) * smoothstep(0.58, 0.86, emberNoise) * fireZone;
    }

    float nDotL = max(0.09, dot(nrm, uSunDir));
    vec3 sunIllum = vec3(2.62, 2.44, 2.18) * nDotL + vec3(0.29, 0.37, 0.49);

    if (uBurstDt > 0.0) {
      vec3 toB = uBurstOrigin - vWorldPos;
      float dB2 = dot(toB, toB);
      float bNdotL = max(0.0, dot(nrm, normalize(toB)));
      sunIllum += vec3(4.2, 2.8, 1.6) * (uFlashPower * 8.5e6 / (3.5e5 + dB2)) * bNdotL;
    }

    surfColor = landAlbedo * sunIllum + groundEmission;
  }

  vec3 skyHorizon = computePhysicalSky(cameraPosition, rayDir, uSunDir, uBurstOrigin, uFlashPower);
  float hazeTrans = exp(-dist * 0.0000105);
  vec3 finalColor = mix(skyHorizon, surfColor, hazeTrans);

  fragColor = vec4(finalColor, 1.0);
}
`;

  // Higher-density 280x280 radial-warped mesh so real Chugoku ridges & Seto Island peaks have true 3D silhouette!
  const geom = new THREE.PlaneGeometry(2, 2, 280, 280);
  geom.rotateX(-Math.PI / 2);

  const uniforms = {
    uRegionalDemTex: { value: regionalDemTex },
    uUrbanDemTex: { value: urbanDemTex },
    uRegionalGridN: { value: activeDem.regional.size },
    uUrbanGridN: { value: activeDem.urban.size },
    uEarthRadius: { value: geo.earthRadiusM },
    uFocusCenter: { value: new THREE.Vector2(0, 0) },
    uSunDir: { value: new THREE.Vector3(...mission.sunDirection).normalize() },
    uTime: { value: 0 },
    uBurstDt: { value: -1 },
    uBurstOrigin: { value: new THREE.Vector3(...mission.burstOrigin) },
    uFlashPower: { value: 0 },
    uGroundWaveR: { value: 0 },
  };

  const mat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: TERRAIN_VERT,
    fragmentShader: TERRAIN_FRAG,
    uniforms,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.frustumCulled = false;

  const skyGeom = new THREE.SphereGeometry(125000, 48, 32);
  const skyMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms,
    vertexShader: `
      out vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = wp.xyz - cameraPosition;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      precision highp float;
      in vec3 vWorldDir;
      out vec4 fragColor;
      uniform vec3 uSunDir;
      uniform vec3 uBurstOrigin;
      uniform float uFlashPower;
      ${SKY_SCATTERING_GLSL}
      void main() {
        vec3 rd = normalize(vWorldDir);
        vec3 col = computePhysicalSky(cameraPosition, rd, uSunDir, uBurstOrigin, uFlashPower);
        fragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(skyGeom, skyMat);
  skyDome.frustumCulled = false;

  const plasmaGeom = new THREE.SphereGeometry(1.0, 32, 24);
  const plasmaUniforms = {
    uCoreIntensity: { value: 0.0 },
    uCoreColor: { value: new THREE.Color(1, 0.95, 0.85) },
  };
  const plasmaMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: plasmaUniforms,
    vertexShader: `
      out vec3 vNrm;
      out vec3 vViewDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vNrm = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      precision highp float;
      in vec3 vNrm;
      in vec3 vViewDir;
      out vec4 fragColor;
      uniform float uCoreIntensity;
      uniform vec3 uCoreColor;
      void main() {
        float rim = max(0.0, dot(normalize(vNrm), normalize(vViewDir)));
        float falloff = pow(rim, 1.85);
        fragColor = vec4(uCoreColor * uCoreIntensity * falloff, falloff);
      }
    `,
  });
  const plasmaCore = new THREE.Mesh(plasmaGeom, plasmaMat);
  plasmaCore.visible = false;
  plasmaCore.frustumCulled = false;

  return {
    terrainMesh: mesh,
    skyDome,
    plasmaCore,
    uniforms,
    setDemArrays(nextDem) {
      if (!nextDem) return;
      const nextRegTex = packDemToRgbaTexture(nextDem.regional.data, nextDem.regional.size);
      const nextUrbTex = packDemToRgbaTexture(nextDem.urban.data, nextDem.urban.size);
      regionalDemTex.dispose();
      urbanDemTex.dispose();
      regionalDemTex = nextRegTex;
      urbanDemTex = nextUrbTex;
      uniforms.uRegionalDemTex.value = regionalDemTex;
      uniforms.uUrbanDemTex.value = urbanDemTex;
      uniforms.uRegionalGridN.value = nextDem.regional.size;
      uniforms.uUrbanGridN.value = nextDem.urban.size;
      activeDem = nextDem;
    },
    update(flightState) {
      uniforms.uTime.value = flightState.time;
      uniforms.uFocusCenter.value.set(
        Math.max(-3500, Math.min(3500, flightState.position[0] * 0.15)),
        Math.max(-3500, Math.min(3500, flightState.position[2] * 0.15))
      );
      skyDome.position.set(
        flightState.position[0],
        flightState.position[1],
        flightState.position[2]
      );
      if (flightState.shock.active) {
        const dt = flightState.shock.dt;
        uniforms.uBurstDt.value = dt;
        uniforms.uFlashPower.value = flightState.shock.flashIntensity;
        uniforms.uGroundWaveR.value = flightState.shock.groundWaveRadius;

        plasmaCore.visible = dt < 6.5;
        if (plasmaCore.visible) {
          const coreY = mission.burstOrigin[1] + 7900.0 * Math.pow(Math.min(1.3, dt / 66.0), 0.74);
          const coreR = 155.0 + 480.0 * Math.pow(Math.min(1.0, dt / 6.5), 0.55);
          plasmaCore.position.set(mission.burstOrigin[0], coreY, mission.burstOrigin[2]);
          plasmaCore.scale.setScalar(coreR);
          const fadeOut = 1.0 - Math.min(1.0, Math.max(0.0, (dt - 2.5) / 4.0));
          plasmaUniforms.uCoreIntensity.value =
            (flightState.shock.flashIntensity * 18.0 + 9.0 * Math.exp(-dt * 0.55)) * fadeOut;
          plasmaUniforms.uCoreColor.value.setRGB(
            1.0,
            Math.min(1.0, 0.52 + Math.exp(-dt * 0.55) * 0.48),
            Math.min(1.0, 0.18 + Math.exp(-dt * 0.95) * 0.88)
          );
        }
      } else {
        uniforms.uBurstDt.value = -1.0;
        uniforms.uFlashPower.value = 0.0;
        uniforms.uGroundWaveR.value = 0.0;
        plasmaCore.visible = false;
      }
    },
  };
}
