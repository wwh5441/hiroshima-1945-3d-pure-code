import { SKY_SCATTERING_GLSL } from "./sky-scattering.glsl.js";
import { MUSHROOM_VOLUME_GLSL } from "../world/mushroom-volume.js";

export const VOLUMETRIC_CLOUDS_VERT = `
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const VOLUMETRIC_CLOUDS_FRAG = `
precision highp float;
precision highp sampler3D;

in vec2 vUv;
out vec4 fragColor;

uniform sampler3D uShapeTex;
uniform sampler3D uErosionTex;
uniform sampler2D uSceneDepthTex;

uniform mat4 uInvProj;
uniform mat4 uInvView;
uniform vec3 uCamPos;
uniform float uNear;
uniform float uFar;
uniform vec3 uSunDir;
uniform float uTime;
uniform int uMaxSteps;

uniform float uBurstDt;
uniform vec3 uBurstOrigin;
uniform float uFlashPower;
uniform float uCloudClearR;
uniform float uWilsonR;
uniform float uWilsonOpacity;

${SKY_SCATTERING_GLSL}
${MUSHROOM_VOLUME_GLSL}

// Interleaved Gradient Noise (Jorge Jimenez) — eliminates periodic Bayer stipple & horizontal slicing!
float ignJitter(vec2 fragCoord) {
  vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
  return fract(magic.z * fract(dot(fragCoord, magic.xy)));
}

float hgPhase(float mu, float g) {
  float g2 = g * g;
  return (1.0 - g2) / (4.0 * 3.14159265 * pow(max(0.02, 1.0 + g2 - 2.0 * g * mu), 1.5));
}

float dualLobeHG(float mu) {
  return mix(hgPhase(mu, -0.28), hgPhase(mu, 0.74), 0.70);
}

float linearizeDepth(float d) {
  float z = d * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
}

float sampleCumulusDensity(vec3 p) {
  float horiz2 = dot(p.xz - uCamPos.xz, p.xz - uCamPos.xz);
  float h = p.y - horiz2 / (2.0 * EARTH_R);

  if (h <= 1680.0 || h >= 3920.0) return 0.0;

  float hFrac = clamp((h - 1680.0) / 2240.0, 0.0, 1.0);
  float heightGrad = smoothstep(0.0, 0.16, hFrac) * smoothstep(1.0, 0.52, hFrac);

  vec3 wind = vec3(uTime * 11.0, 0.0, -uTime * 4.5);
  vec4 baseSample = texture(uShapeTex, (p + wind) * 0.000105);
  vec4 macroSample = texture(uShapeTex, (p * 0.27 - wind * 0.4) * 0.000095);

  float distCenter = length(p.xz);
  // Historically authentic Aug 6, 1945 morning clear visual bombing window (3/10 scattered peripheral cumulus,
  // 100% clear opening over the 6.5km Hiroshima urban delta & Aioi T-Bridge!)
  float targetWindow = smoothstep(5600.0, 11800.0, distCenter);
  float coverage = mix(0.0, 0.56, targetWindow) + (macroSample.g - 0.5) * 0.22 * targetWindow;

  if (uCloudClearR > 50.0) {
    float dBlast = length(p.xz - uBurstOrigin.xz);
    float hole = smoothstep(uCloudClearR * 0.78, uCloudClearR * 1.02, dBlast);
    float rim = exp(-pow((dBlast - uCloudClearR) / 380.0, 2.0)) * 0.34 * exp(-uBurstDt * 0.028);
    coverage = coverage * mix(0.02, 1.0, hole) + rim;
  }

  float baseCloud = clamp((baseSample.r * heightGrad - (1.0 - coverage)) / max(0.14, coverage), 0.0, 1.0);
  if (baseCloud <= 0.004) return 0.0;

  float worleyFbm = baseSample.g * 0.625 + baseSample.b * 0.25 + baseSample.a * 0.125;
  float shaped = clamp(baseCloud - (1.0 - worleyFbm) * 0.34 * (1.0 - baseCloud), 0.0, 1.0);
  if (shaped <= 0.004) return 0.0;

  float erode = texture(uErosionTex, (p + wind * 1.4) * 0.00058).r;
  float erodeAmt = mix(erode, 1.0 - erode, clamp(hFrac * 1.3, 0.0, 1.0));
  return clamp(shaped - erodeAmt * 0.26 * (1.0 - shaped * 0.6), 0.0, 1.0) * 0.017;
}

// Compute exact entry/exit distances of ray with the [1680m, 3920m] curved-Earth cumulus slab!
// Concentrates 100% of cloud samples inside the actual cloud layer -> zero "pancake" slicing!
vec2 intersectCumulusSlab(vec3 camWorld, vec3 worldDir, float maxDist) {
  vec3 ro = vec3(0.0, EARTH_R + max(10.0, camWorld.y), 0.0);
  vec2 hitTop = raySphereIntersect(ro, worldDir, EARTH_R + 3920.0);
  if (hitTop.y < 0.0) return vec2(-1.0);

  vec2 hitBot = raySphereIntersect(ro, worldDir, EARTH_R + 1680.0);
  float hCam = camWorld.y;

  float t0 = 0.0;
  float t1 = maxDist;

  if (hCam >= 3920.0) {
    // Camera is ABOVE cumulus layer (e.g. 8,900m - 9,467m): ray must point down to hit top sphere
    if (hitTop.x < 0.0) return vec2(-1.0);
    t0 = hitTop.x;
    t1 = (hitBot.x > 0.0) ? hitBot.x : hitTop.y;
  } else if (hCam <= 1680.0) {
    t0 = max(0.0, hitBot.y);
    t1 = hitTop.y;
  } else {
    t0 = 0.0;
    t1 = (hitBot.x > 0.0) ? hitBot.x : hitTop.y;
  }

  t1 = min(t1, min(maxDist, t0 + 26000.0));
  if (t1 <= t0 + 5.0) return vec2(-1.0);
  return vec2(t0, t1);
}

void integrateSegment(
  float segStart,
  float segEnd,
  int segSteps,
  bool includePlume,
  float jitter,
  vec3 worldDir,
  float phase,
  vec3 fireballPos,
  float fireballGlowPower,
  inout vec3 accumLight,
  inout float trans
) {
  float span = segEnd - segStart;
  if (span <= 2.0 || trans < 0.012) return;

  float ds = span / float(segSteps);
  for (int i = 0; i < 64; i++) {
    if (i >= segSteps || trans < 0.012) break;
    float t = segStart + (float(i) + jitter) * ds;
    vec3 p = uCamPos + worldDir * t;

    float cloudDens = sampleCumulusDensity(p);
    float sootDarkness = 0.0;
    vec4 plume = includePlume
      ? sampleMushroomPlume(p, uBurstDt, uBurstOrigin, uWilsonR, uWilsonOpacity, uShapeTex, uErosionTex, sootDarkness)
      : vec4(0.0);

    float totalDens = cloudDens + plume.x;
    if (totalDens > 0.0001) {
      // Strong self-shadowing inside dense smoke plume so mushroom folds have dramatic 3D contrast!
      float sunTau = 0.0;
      sunTau += sampleCumulusDensity(p + uSunDir * 140.0) * 140.0;
      sunTau += sampleCumulusDensity(p + uSunDir * 420.0) * 280.0;
      if (includePlume && uBurstDt > 0.5) {
        float dummySoot;
        sunTau += sampleMushroomPlume(
          p + uSunDir * 220.0, uBurstDt, uBurstOrigin, 0.0, 0.0, uShapeTex, uErosionTex, dummySoot
        ).x * 360.0;
        sunTau += sampleMushroomPlume(
          p + uSunDir * 640.0, uBurstDt, uBurstOrigin, 0.0, 0.0, uShapeTex, uErosionTex, dummySoot
        ).x * 480.0;
      }

      float plumeWeight = plume.x / max(1e-5, totalDens);
      float shadowStrength = mix(1.15, 2.85, plumeWeight);
      float beer = exp(-sunTau * shadowStrength);
      float powder = 1.0 - exp(-totalDens * ds * 2.2);
      float sunVis = mix(beer, beer * (0.30 + 0.88 * powder), 0.65);

      float hAmb = clamp((p.y - 1200.0) / 5500.0, 0.0, 1.0);
      // Cool slate-violet shadow ambient for smoke folds vs sky blue for white cumulus
      vec3 cloudAmb = mix(vec3(0.30, 0.36, 0.46), vec3(0.66, 0.77, 0.94), hAmb);
      vec3 sootAmb  = mix(vec3(0.09, 0.08, 0.105), vec3(0.20, 0.185, 0.23), hAmb);
      vec3 ambient = mix(cloudAmb, sootAmb, plumeWeight * sootDarkness);

      // Scatter albedo: crisp white cumulus vs sculpted ivory-taupe & charcoal nuclear smoke!
      vec3 plumeAlbedo = mix(vec3(0.76, 0.72, 0.68), vec3(0.16, 0.135, 0.14), sootDarkness);
      vec3 scatterAlbedo = mix(
        vec3(1.0, 0.99, 0.97),
        plumeAlbedo,
        plumeWeight
      );

      vec3 sunColor = vec3(3.05, 2.82, 2.52);
      float effPhase = mix(0.36 + 1.50 * phase, 0.42 + 0.35 * phase, plumeWeight);
      vec3 inScatter = scatterAlbedo * (ambient * 0.60 + sunColor * sunVis * effPhase);

      // Fireball point-light illuminates surrounding cumulus bases strongly during first 15s,
      // without washing out the dark smoke stem in late stages!
      if (fireballGlowPower > 0.01) {
        vec3 toFB = fireballPos - p;
        float dFB = length(toFB);
        float attenFB = 1.0 / (1.0 + dFB * dFB * 1.6e-7);
        vec3 fbTint = mix(vec3(3.4, 1.35, 0.38), vec3(4.2, 4.0, 3.8), clamp(uFlashPower * 0.4, 0.0, 1.0));
        float selfMask = 1.0 - plumeWeight * sootDarkness * 0.82;
        inScatter += scatterAlbedo * fbTint * fireballGlowPower * attenFB * selfMask;
      }

      float aerial = 1.0 - exp(-t * 0.000019);
      vec3 hazeSky = vec3(0.70, 0.80, 0.93) * 1.08;
      vec3 stepRadiance = mix(
        inScatter * totalDens + plume.yzw,
        hazeSky * totalDens,
        aerial * 0.52 * (1.0 - plumeWeight * 0.65)
      );

      float stepTrans = exp(-totalDens * ds);
      vec3 integScatter = stepRadiance * ((1.0 - stepTrans) / max(1e-5, totalDens));
      accumLight += trans * integScatter;
      trans *= stepTrans;
    }
  }
}

void main() {
  vec4 ndc = vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec4 viewRay = uInvProj * ndc;
  viewRay /= viewRay.w;
  vec3 worldDir = normalize((uInvView * vec4(viewRay.xyz, 0.0)).xyz);

  float rawDepth = texture(uSceneDepthTex, vUv).r;
  float maxDist = 82000.0;
  if (rawDepth < 0.99995) {
    float viewZ = linearizeDepth(rawDepth);
    float cosView = max(0.05, dot(normalize(viewRay.xyz), vec3(0.0, 0.0, -1.0)));
    maxDist = min(maxDist, viewZ / cosView);
  }

  if (maxDist <= 5.0) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float jitter = ignJitter(gl_FragCoord.xy);
  float phase = dualLobeHG(dot(worldDir, uSunDir));
  float fireballLightY = uBurstOrigin.y + (uBurstDt > 0.0 ? 5200.0 * pow(clamp(uBurstDt / 66.0, 0.0, 1.2), 0.74) : 0.0);
  vec3 fireballPos = vec3(uBurstOrigin.x, fireballLightY, uBurstOrigin.z);
  // Rapid thermal decay so late mushroom smoke isn't artificially washed out
  float fireballGlowPower = uBurstDt > 0.0 ? (uFlashPower * 6.0 + 2.4 * exp(-uBurstDt * 0.085)) : 0.0;

  vec3 accumLight = vec3(0.0);
  float trans = 1.0;

  vec2 cloudSlab = intersectCumulusSlab(uCamPos, worldDir, maxDist);

  // Dedicated Tight-Cylinder Ultra-Fine Plume Sub-March whenever detonation is active!
  if (uBurstDt > 0.0) {
    float dynPlumeR = max(
      1150.0,
      max(
        (220.0 + 1620.0 * pow(clamp(uBurstDt / 64.0, 0.0, 1.3), 0.64)) * 2.05,
        (uWilsonOpacity > 0.005 ? uWilsonR + 280.0 : 0.0)
      )
    );
    vec2 cylHit = rayCylinderXZ(uCamPos, worldDir, uBurstOrigin.xz, dynPlumeR);
    float p0 = max(0.0, cylHit.x);
    float p1 = min(maxDist, cylHit.y);

    if (cylHit.y > 0.0 && p1 > p0 + 5.0) {
      // 1. Foreground cumulus slab strictly before p0
      if (cloudSlab.y > 0.0 && cloudSlab.x < p0) {
        integrateSegment(cloudSlab.x, min(cloudSlab.y, p0), 24, false, jitter, worldDir, phase, fireballPos, fireballGlowPower, accumLight, trans);
      }
      // 2. Ultra-fine 48-step uniform march directly through Nuclear Plume + overlapping cumulus
      integrateSegment(p0, p1, 48, true, jitter, worldDir, phase, fireballPos, fireballGlowPower, accumLight, trans);
      // 3. Background cumulus slab strictly behind p1
      if (cloudSlab.y > p1 && trans > 0.02) {
        integrateSegment(max(cloudSlab.x, p1), cloudSlab.y, 24, false, jitter, worldDir, phase, fireballPos, fireballGlowPower, accumLight, trans);
      }
      fragColor = vec4(accumLight, trans);
      return;
    }
  }

  // Exact spherical cumulus slab raymarch (all uMaxSteps land strictly inside 1,680m..3,920m cloud layer!)
  if (cloudSlab.y > 0.0) {
    integrateSegment(cloudSlab.x, cloudSlab.y, uMaxSteps, false, jitter, worldDir, phase, fireballPos, fireballGlowPower, accumLight, trans);
  }

  fragColor = vec4(accumLight, trans);
}
`;
