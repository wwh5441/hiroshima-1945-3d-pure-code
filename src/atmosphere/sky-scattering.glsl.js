export const SKY_SCATTERING_GLSL = `
const float EARTH_R = 6371000.0;
const float ATMO_R  = 6451000.0;
const vec3  BETA_R  = vec3(5.802e-6, 13.558e-6, 33.100e-6);
const float BETA_M  = 3.996e-6;
const float H_RAY   = 8000.0;
const float H_MIE   = 1200.0;

vec2 raySphereIntersect(vec3 ro, vec3 rd, float rad) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - rad * rad;
  float disc = b * b - c;
  if (disc < 0.0) return vec2(-1.0);
  float s = sqrt(disc);
  return vec2(-b - s, -b + s);
}

float phaseRayleigh(float mu) {
  return (3.0 / (16.0 * 3.14159265)) * (1.0 + mu * mu);
}

float phaseMieCS(float mu, float g) {
  float g2 = g * g;
  float num = 3.0 * (1.0 - g2) * (1.0 + mu * mu);
  float den = (8.0 * 3.14159265) * (2.0 + g2) * pow(max(0.02, 1.0 + g2 - 2.0 * g * mu), 1.5);
  return num / den;
}

vec3 computePhysicalSky(vec3 camWorld, vec3 rayDir, vec3 sunDir, vec3 burstPos, float flashPower) {
  vec3 ro = vec3(0.0, EARTH_R + max(10.0, camWorld.y), 0.0);
  vec2 hitAtmo = raySphereIntersect(ro, rayDir, ATMO_R);
  vec2 hitEarth = raySphereIntersect(ro, rayDir, EARTH_R);

  float tMax = hitAtmo.y;
  if (hitEarth.x > 0.0) {
    tMax = min(tMax, hitEarth.x);
  }
  tMax = min(tMax, 135000.0);

  const int STEPS = 12;
  float ds = tMax / float(STEPS);
  float optR = 0.0;
  float optM = 0.0;
  vec3 sumR = vec3(0.0);
  vec3 sumM = vec3(0.0);

  for (int i = 0; i < STEPS; i++) {
    vec3 p = ro + rayDir * ((float(i) + 0.5) * ds);
    float h = max(0.0, length(p) - EARTH_R);
    float dR = exp(-h / H_RAY) * ds;
    float dM = exp(-h / H_MIE) * ds;
    optR += dR;
    optM += dM;

    float sunZenith = max(0.04, dot(normalize(p), sunDir));
    float sunAirMass = 1.0 / (sunZenith + 0.15 * pow(sunZenith * 57.3 + 3.885, -1.253));
    float sOptR = H_RAY * exp(-h / H_RAY) * sunAirMass;
    float sOptM = H_MIE * exp(-h / H_MIE) * sunAirMass;

    vec3 tau = BETA_R * (optR + sOptR) + BETA_M * 1.12 * (optM + sOptM);
    vec3 atten = exp(-tau);
    sumR += dR * atten;
    sumM += dM * atten;
  }

  float mu = dot(rayDir, sunDir);
  vec3 sunIrradiance = vec3(21.5, 20.6, 19.8);
  vec3 sky = sunIrradiance * (sumR * BETA_R * phaseRayleigh(mu) + sumM * BETA_M * phaseMieCS(mu, 0.76));

  if (hitEarth.x < 0.0) {
    float sunDisc = smoothstep(0.99972, 0.99993, mu);
    float sunHalo = pow(max(0.0, mu), 240.0) * 0.55;
    sky += vec3(32.0, 27.0, 20.0) * sunDisc + vec3(2.2, 1.8, 1.3) * sunHalo;
  }

  if (flashPower > 0.001) {
    vec3 toBurst = normalize(burstPos - camWorld);
    float bMu = max(0.0, dot(rayDir, toBurst));
    float glow = pow(bMu, 5.0) * 0.85 + pow(bMu, 28.0) * 2.4 + 0.14;
    vec3 flashTint = mix(vec3(1.0, 0.68, 0.34), vec3(0.95, 0.98, 1.15), clamp(flashPower * 0.45, 0.0, 1.0));
    sky += flashTint * flashPower * glow * 3.8;
  }

  return max(sky, vec3(0.0));
}
`;
