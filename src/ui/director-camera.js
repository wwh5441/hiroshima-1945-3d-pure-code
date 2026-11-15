// Dual-Mode Camera Pointer Controller:
// - Cockpit Stations (1·Captain, 2·Bombardier, 3·Tail Gunner): bounded +/-28° peek that springs smoothly back on release.
// - Escort Station (4·The Great Artiste): full 360° orbit rotation + scroll-wheel zoom (double-click to reset).

export function installSubtleLookDrag(canvas, headController, getActiveStation, onInteract) {
  let startX = 0;
  let startY = 0;
  let baseYaw = 0;
  let basePitch = 0;
  let dragStation = "captain";

  const maxCockpitYaw = 0.52;
  const maxCockpitPitch = 0.34;

  const onDown = (e) => {
    dragStation = getActiveStation();
    startX = e.clientX;
    startY = e.clientY;
    if (dragStation === "escort") {
      headController.escortOrbit.dragging = true;
      baseYaw = headController.escortOrbit.yawOffset;
      basePitch = headController.escortOrbit.pitchOffset;
    } else {
      headController.userLook.dragging = true;
      baseYaw = headController.userLook.yaw;
      basePitch = headController.userLook.pitch;
    }
    onInteract?.();
  };

  const onMove = (e) => {
    const dx = (e.clientX - startX) / Math.max(320, window.innerWidth);
    const dy = (e.clientY - startY) / Math.max(240, window.innerHeight);

    if (headController.escortOrbit.dragging) {
      headController.escortOrbit.yawOffset = baseYaw - dx * 3.4;
      headController.escortOrbit.pitchOffset = Math.max(-1.15, Math.min(1.15, basePitch + dy * 2.1));
      onInteract?.();
    } else if (headController.userLook.dragging) {
      headController.userLook.yaw = Math.max(-maxCockpitYaw, Math.min(maxCockpitYaw, baseYaw - dx * 1.25));
      headController.userLook.pitch = Math.max(-maxCockpitPitch, Math.min(maxCockpitPitch, basePitch - dy * 0.90));
      onInteract?.();
    }
  };

  const onUp = () => {
    headController.userLook.dragging = false;
    headController.escortOrbit.dragging = false;
    onInteract?.();
  };

  const onWheel = (e) => {
    if (getActiveStation() !== "escort") return;
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.08 : 0.925;
    headController.escortOrbit.distScale = Math.max(
      0.42,
      Math.min(2.6, headController.escortOrbit.distScale * factor)
    );
    onInteract?.();
  };

  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  canvas.addEventListener("dblclick", () => {
    headController.userLook.yaw = 0;
    headController.userLook.pitch = 0;
    headController.escortOrbit.yawOffset = 0;
    headController.escortOrbit.pitchOffset = 0;
    headController.escortOrbit.distScale = 1.0;
    onInteract?.();
  });
}
