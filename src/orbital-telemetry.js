import * as THREE from 'three';

const EARTH_RADIUS_KM = 6371;
const EARTH_GRAVITATIONAL_PARAMETER = 398600.44;

export function getTelemetrySnapshot(contact, elapsedSeconds) {
  const angle = elapsedSeconds * (Math.PI * 2 / 43) + contact.phase;
  const latitude = Math.asin(Math.sin(THREE.MathUtils.degToRad(contact.inclination)) * Math.sin(angle)) * 180 / Math.PI;
  const longitude = ((THREE.MathUtils.radToDeg(angle) - elapsedSeconds * 0.22 + 540) % 360) - 180;
  const velocityKmS = Math.sqrt(EARTH_GRAVITATIONAL_PARAMETER / (EARTH_RADIUS_KM + contact.altitude));
  const pingMs = 6 + (1 + Math.sin(angle * 0.7)) * 7 + Math.round(Math.abs(latitude) * 0.015);
  return { angle, latitude, longitude, velocityKmS, pingMs, pathProgress: ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) };
}

export function evaluateSignal(contact, phase, elevation, timeMs = performance.now()) {
  const phaseDifference = Math.abs(((Number(phase) - contact.targetPhase + 540) % 360) - 180);
  const elevationDifference = Math.abs(Number(elevation) - contact.targetElevation);
  const noise = 8 + (Math.sin(timeMs * 0.0018 + contact.phase) + 1) * 7;
  const quality = Math.max(0, Math.min(100, Math.round(100 - phaseDifference * 0.22 - elevationDifference * 1.45 - noise)));
  return { phaseDifference, elevationDifference, noise, quality, lockReady: phaseDifference <= 7 && elevationDifference <= 3 && quality >= 55 };
}
