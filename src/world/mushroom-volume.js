export const MUSHROOM_VOLUME_GLSL = `
vec3 blackbodyEmission(float temp) {
  if (temp <= 0.03) return vec3(0.0);
  vec3 c1 = vec3(0.75, 0.09, 0.012); // 1250K deep ember fissure
  vec3 c2 = vec3(3.60, 0.85, 0.10);  // 2400K rich volcanic orange
  vec3 c3 = vec3(13.5, 9.80, 4.40);  // 5200K early thermal yellow-white
  vec3 c4 = vec3(34.0, 36.0, 44.0);  // 11000K initial airburst flash
  if (temp < 0.34) return mix(vec3(0.0), c1, temp / 0.34);
  if (temp < 0.68) return mix(c1, c2, (temp - 0.34) / 0.34);
  if (temp < 0.94) return mix(c2, c3, (temp - 0.68) / 0.26);
  return mix(c3, c4, clamp((temp - 0.94) / 0.45, 0.0, 1.0));
}

vec2 rayCylinderXZ(vec3 ro, vec3 rd, vec2 centerXZ, float rad) {
  vec2 oc = ro.xz - centerXZ;
  float a = dot(rd.xz, rd.xz);
  if (a < 1e-6) {
    return dot(oc, oc) <= rad * rad ? vec2(0.0, 1e5) : vec2(-1.0);
  }
  float b = dot(oc, rd.xz);
  float c = dot(oc, oc) - rad * rad;
  float disc = b * b - a * c;
  if (disc < 0.0) return vec2(-1.0);
  float s = sqrt(disc);
  return vec2((-b - s) / a, (-b + s) / a);
}

// Returns vec4(density, emissionR, emissionG, emissionB), plus sets outAlbedoWeight (0=white vapor, 1=dark ash soot)
vec4 sampleMushroomPlume(
  vec3 p,
  float dtBurst,
  vec3 burstOrigin,
  float wilsonRadius,
  float wilsonOpacity,
  sampler3D shapeTex,
  sampler3D erosionTex,
  out float sootDarkness
) {
  sootDarkness = 0.0;
  if (dtBurst <= 0.0) return vec4(0.0);

  float capY = burstOrigin.y + 7900.0 * pow(clamp(dtBurst / 66.0, 0.0, 1.3), 0.74);
  float capMajorR = 220.0 + 1620.0 * pow(clamp(dtBurst / 64.0, 0.0, 1.3), 0.64);
  float capMinorR = capMajorR * mix(0.92, 0.58, smoothstep(1.5, 16.0, dtBurst));

  vec2 relXZ = p.xz - burstOrigin.xz;
  float r = length(relXZ);

  float maxBoundR = max(capMajorR + capMinorR + 750.0, wilsonRadius + 260.0);
  if (r > maxBoundR || p.y > capY + capMinorR * 1.75 + 750.0 || p.y < 0.0) {
    return vec4(0.0);
  }

  float totalDensity = 0.0;
  vec3 totalEmission = vec3(0.0);
  float sootAccum = 0.0;

  // 1. Toroidal Boiling Fireball -> Purple-Charcoal & Ivory Cauliflower Mushroom Crown
  float dyCap = p.y - capY;
  float torusMorph = smoothstep(2.0, 13.0, dtBurst);
  float ringCenterR = capMajorR * 0.54 * torusMorph;
  vec2 torusVec = vec2(r - ringCenterR, dyCap * 1.08);
  float dTorus = length(torusVec) - capMinorR;
  // Keep central dome recessed smoothly inside the rolling toroidal crown so billows sculpt the entire top!
  float dDome = length(vec2(r * 0.78, max(0.0, dyCap) * 1.18 + min(0.0, dyCap) * 1.65)) - capMajorR * 0.66;
  float capSdf = min(dTorus, dDome);

  if (capSdf < 560.0) {
    float poloidalAngle = atan(torusVec.y, torusVec.x) - dtBurst * 0.52;
    float azimAngle = atan(relXZ.y, relXZ.x);
    vec3 vortexUVW = vec3(
      azimAngle * 0.9549 + 0.5,
      poloidalAngle * 0.4775,
      length(torusVec) / max(180.0, capMinorR * 1.35) - dtBurst * 0.045
    );
    vec4 nShape = texture(shapeTex, vortexUVW * 1.65);
    // Multi-octave 3D Worley-Perlin cauliflower turrets (735m -> 367m -> 184m -> 92m hierarchy!)
    vec3 boilShift = vec3(0.0, dtBurst * 0.018, 0.0);
    vec4 nCrown = texture(shapeTex, p * 0.00034 - boilShift);
    vec4 nErode = texture(erosionTex, p * 0.00095 - boilShift * 1.6);

    float upperCrown = smoothstep(-capMinorR * 0.20, capMinorR * 0.35, dyCap);
    // Cellular Worley lobes (nCrown.g=367m, .b=184m, .a=92m) sculpt distinct cauliflower domes & dark creases!
    float worleyTurrets = nCrown.r * 0.30 + nCrown.g * 0.42 + nCrown.b * 0.20 + nCrown.a * 0.08;
    float torusBillow = nShape.r * 0.48 + nShape.g * 0.52;
    float billow = mix(torusBillow, worleyTurrets, 0.78 * upperCrown + 0.22);
    float detail = nErode.r * 0.65 + nErode.g * 0.35;

    float disp = (billow - 0.42) * capMinorR * 0.88 + (detail - 0.46) * capMinorR * 0.34;
    float dWarped = capSdf - disp;
    float dens = smoothstep(48.0, -125.0, dWarped) * 0.095;

    if (dens > 0.0001) {
      totalDensity += dens;
      // Soot darkness: deep Worley creases stay dark charcoal/ash (0.86+), turret tops warm smoky-ivory (0.44+)
      float crownTopIce = smoothstep(capY + capMinorR * 0.35, capY + capMinorR * 1.10, p.y) * smoothstep(18.0, 46.0, dtBurst);
      float creviceShade = (0.56 - billow) * 0.85 + (0.50 - detail) * 0.35;
      float foldSoot = clamp(0.84 - crownTopIce * 0.26 + creviceShade, 0.44, 0.97);
      sootAccum += dens * foldSoot * smoothstep(1.8, 8.5, dtBurst);

      // Early 0..5s: blazing fireball; after 8s: glowing fire strictly confined to deep turbulent fissures!
      float earlyFlash = smoothstep(6.5, 0.0, dtBurst) * 1.15;
      float deepFissure = pow(clamp(1.0 - billow * 1.16, 0.0, 1.0), 3.1) * clamp(-dWarped / 160.0, 0.2, 1.0);
      float internalEmber = deepFissure * 1.05 * exp(-dtBurst * 0.068);
      float temp = earlyFlash + internalEmber;
      totalEmission += blackbodyEmission(temp) * dens;
    }
  }

  // 2. Rising Mach-Stem Dust Column & Dark Ash Bell Skirt (NOT glowing white after early flash!)
  if (dtBurst > 1.2 && p.y < capY + capMinorR * 0.28) {
    float stemH = max(220.0, capY);
    float hNorm = clamp(p.y / stemH, 0.0, 1.0);
    float baseSkirt = 1120.0 * exp(-hNorm * 6.2) * smoothstep(1.2, 8.0, dtBurst);
    float upperFlare = capMajorR * 0.50 * pow(hNorm, 3.2);
    float stemRadius = (180.0 + 240.0 * smoothstep(2.0, 42.0, dtBurst)) + baseSkirt + upperFlare;

    if (r < stemRadius + 250.0) {
      vec3 stemUVW = vec3(p.x * 0.00058, p.y * 0.00040 - dtBurst * 0.045, p.z * 0.00058);
      float sNoise = texture(shapeTex, stemUVW).r;
      float sDetail = texture(erosionTex, p * 0.0012).r;
      float sSdf = (r - stemRadius) - (sNoise * 0.7 + sDetail * 0.3 - 0.44) * 230.0;
      float sDens = smoothstep(42.0, -105.0, sSdf) * 0.056 * smoothstep(1.2, 4.5, dtBurst);

      if (sDens > 0.0001) {
        totalDensity += sDens;
        // Heavy dark brown-violet debris & ash column
        sootAccum += sDens * 0.92;

        // Only glow at very base ground firestorm (p.y < 320m) & early upper throat (< 14s)!
        float throatEarly = pow(hNorm, 4.5) * exp(-dtBurst * 0.11) * 0.65;
        float baseEmbers = (1.0 - smoothstep(60.0, 340.0, p.y)) * pow(clamp(1.0 - sNoise, 0.0, 1.0), 2.2) * 0.52;
        totalEmission += blackbodyEmission(max(throatEarly, baseEmbers)) * sDens;
      }
    }
  }

  // 3. Wispy early Pileus Ice-Crystal Scarf (5s..18s only, tenuous & noise-feathered so it never caps the dome!)
  float pileusWindow = smoothstep(5.0, 9.5, dtBurst) * (1.0 - smoothstep(13.0, 19.0, dtBurst));
  if (pileusWindow > 0.01) {
    float hoodY = capY + capMinorR * 1.36 + 210.0;
    float hoodWarp = (texture(erosionTex, p * 0.0014).r - 0.5) * 65.0;
    float hoodShell = abs(p.y - (hoodY - (r * r) / max(1100.0, capMajorR * 3.8)) + hoodWarp) - 38.0;
    if (hoodShell < 28.0 && r < capMajorR * 1.18) {
      float pDens = smoothstep(28.0, -18.0, hoodShell) * (1.0 - smoothstep(capMajorR * 0.72, capMajorR * 1.18, r)) * pileusWindow * 0.0065;
      totalDensity += pDens;
      sootAccum += pDens * 0.25;
    }
  }

  // 4. Expanding Spherical Wilson Condensation Vapor Ring (0.3s .. 6.5s)
  if (wilsonOpacity > 0.005 && p.y > 240.0) {
    float dBurst = length(p - burstOrigin);
    float shellDist = abs(dBurst - wilsonRadius);
    if (shellDist < 175.0) {
      float wNoise = texture(erosionTex, p * 0.00055).r;
      float wDens = smoothstep(175.0, 12.0, shellDist) * (0.6 + 0.4 * wNoise) * wilsonOpacity * 0.025;
      totalDensity += wDens;
      totalEmission += vec3(1.1, 1.08, 1.05) * wDens * exp(-dtBurst * 0.9) * 2.5;
    }
  }

  if (totalDensity > 1e-5) {
    sootDarkness = clamp(sootAccum / totalDensity, 0.0, 1.0);
  }
  return vec4(totalDensity, totalEmission);
}
`;
