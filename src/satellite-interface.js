import { evaluateSignal, getTelemetrySnapshot } from './orbital-telemetry.js';

const formatCoordinate = (value, positive, negative) => `${Math.abs(value).toFixed(2)}° ${value >= 0 ? positive : negative}`;

export function createSatelliteInterface({ host, onLock, onClose }) {
  let selectedContact = null;

  function renderSignalReadout() {
    if (!selectedContact || host.hidden) return;
    const phaseSlider = host.querySelector('#phase-slider');
    if (!phaseSlider) return;
    const signal = evaluateSignal(selectedContact, phaseSlider.value);
    host.querySelector('#contact-quality').textContent = `${signal.quality}%`;
    host.querySelector('#contact-quality-fill').style.width = `${signal.quality}%`;
    host.querySelector('#signal-distance').textContent = `${signal.phaseDifference}° TO TARGET`;
    host.querySelector('#phase-readout').textContent = `${phaseSlider.value}°`;
    const feedback = host.querySelector('#tune-feedback');
    if (selectedContact.locked) {
      feedback.textContent = 'Signal locked. This satellite is connected.';
      return;
    }
    feedback.textContent = signal.lockReady
      ? 'Signal locked! Telemetry link connected.'
      : `${signal.phaseDifference}° away. Move the dial toward ${selectedContact.targetPhase}°.`;
    if (signal.lockReady) {
      selectedContact.locked = true;
      host.querySelector('.contact-status')?.classList.add('locked');
      host.querySelector('.contact-status b')?.replaceChildren(document.createTextNode('SIGNAL LOCKED'));
      onLock?.(selectedContact);
    }
  }

  function show(contact, elapsedSeconds = 0) {
    selectedContact = contact;
    host.hidden = false;
    host.innerHTML = `
      <div class="telemetry-head"><div><div class="section-kicker">ORBITAL CONTACT / LIVE TELEMETRY</div><h2>${contact.name}</h2></div><button class="icon-button telemetry-close" id="telemetry-close" aria-label="Close telemetry">×</button></div>
      <div class="contact-status ${contact.locked ? 'locked' : ''}"><i></i><b>${contact.locked ? 'SIGNAL LOCKED' : 'NOMINAL'}</b><span>UPLINK AVAILABLE</span></div>
      <div class="telemetry-stats"><div><span>LATITUDE</span><b id="contact-lat">—</b></div><div><span>LONGITUDE</span><b id="contact-lon">—</b></div><div><span>ALTITUDE</span><b>${contact.altitude} <small>KM</small></b></div><div><span>VELOCITY</span><b id="contact-velocity">—</b></div><div><span>ORBIT PERIOD</span><b>${contact.period} <small>MIN</small></b></div><div><span>SIGNAL PING</span><b id="contact-ping">—</b></div></div>
      <div class="orbit-vector"><div class="vector-track"><svg viewBox="0 0 260 54" aria-hidden="true"><path d="M4 38C40 7 75 6 106 30s63 27 92 1 42-22 58-16"/><path class="vector-line" d="M4 38C40 7 75 6 106 30s63 27 92 1 42-22 58-16"/><circle id="vector-dot" cx="12" cy="32" r="4"/></svg><span>LIVE VECTOR PATH / INCLINATION ${contact.inclination.toFixed(1)}°</span></div><span class="vector-direction">↗ ASCENDING</span></div>
      <div class="tune-panel"><div class="tune-heading"><div><div class="section-kicker">MINIGAME / SIGNAL ACQUISITION</div><h3>Find the beacon.</h3></div><span class="signal-readout" id="contact-quality">0%</span></div><p>Move one dial to the target. The signal locks automatically when you get close.</p><div class="target-line"><span>BEACON TARGET</span><b>${contact.targetPhase}° PHASE</b></div>
        <label class="tune-slider"><span>ANTENNA DIAL</span><input id="phase-slider" type="range" min="0" max="359" value="${Math.max(0, contact.targetPhase - 30)}"/><b id="phase-readout">${Math.max(0, contact.targetPhase - 30)}°</b></label><div class="noise-meter"><span>SIGNAL STRENGTH</span><b id="signal-distance">—</b><div class="quality-track"><i id="contact-quality-fill"></i></div></div><div class="tune-feedback" id="tune-feedback">Move the dial toward the beacon target.</div>
      </div>`;
    host.querySelector('#telemetry-close').addEventListener('click', () => { host.hidden = true; selectedContact = null; onClose?.(); });
    host.querySelector('#phase-slider').addEventListener('input', renderSignalReadout);
    renderSignalReadout();
    update(elapsedSeconds);
  }

  function update(elapsedSeconds) {
    if (!selectedContact || host.hidden) return;
    const state = getTelemetrySnapshot(selectedContact, elapsedSeconds);
    const lat = host.querySelector('#contact-lat');
    if (!lat) return;
    lat.textContent = formatCoordinate(state.latitude, 'N', 'S');
    host.querySelector('#contact-lon').textContent = formatCoordinate(state.longitude, 'E', 'W');
    host.querySelector('#contact-velocity').textContent = `${state.velocityKmS.toFixed(2)} KM/S`;
    host.querySelector('#contact-ping').textContent = `${state.pingMs.toFixed(0)} MS`;
    host.querySelector('#vector-dot').setAttribute('cx', String(12 + state.pathProgress * 236));
    host.querySelector('#vector-dot').setAttribute('cy', String(28 + Math.sin(state.angle) * 15));
    renderSignalReadout();
  }

  return { show, update, close: () => { host.hidden = true; selectedContact = null; onClose?.(); } };
}
