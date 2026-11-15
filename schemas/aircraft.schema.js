export function validateAircraftSpec(spec, instruments) {
  const errors = [];
  if (!spec || !spec.cockpit || !spec.fuselage || !spec.wing || !Array.isArray(spec.engines)) {
    errors.push("Missing core B-29 airframe, fuselage, or empennage sections");
  }
  if (Math.abs(spec.totalLengthM - 30.18) > 0.25) {
    errors.push("B-29 airframe must span full 30.18m length");
  }
  if (Math.abs(spec.wing.thicknessRatioRoot - 0.22) > 0.01) {
    errors.push("Boeing 117 airfoil root thickness ratio must be 22% (0.22)");
  }
  if (spec.engines.length !== 4) {
    errors.push("B-29 requires exactly 4 Wright R-3350 engine nacelles");
  }
  if (
    !instruments ||
    !Array.isArray(instruments.captainDials) ||
    !Array.isArray(instruments.copilotDials) ||
    instruments.captainDials.length < 8 ||
    instruments.copilotDials.length < 8
  ) {
    errors.push("Both Captain and Copilot panels require full USAAF flight dial sets");
  }
  if (instruments.captainDials.some((d) => d.cellId.startsWith("eng_"))) {
    errors.push("Engine dials belong on Flight Engineer panel, not Captain panel");
  }
  if (errors.length > 0) {
    throw new Error("Invalid Aircraft Schema: " + errors.join("; "));
  }
  return true;
}
