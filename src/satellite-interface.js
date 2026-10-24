import { evaluateSignal, getTelemetrySnapshot } from './orbital-telemetry.js';

const formatCoordinate = (value, positive, negative) => `${Math.abs(value).toFixed(2)}° ${value >= 0 ? positive : negative}`;

export function createSatelliteInterface({ host, onLock, onClose }) {
  let selectedContact = null;

  function renderSignalReadout() {
    if (!selectedContact || host.hidden) return;
    const phaseSlider = host.querySelector('#phase-slider');
    const elevationSlider = host.querySelector('#elevation-slider');
    if (!phaseSlider || !elevationSlider) return;
    const signal = evaluateSignal(selectedContact, phaseSlider.value, elevationSlider.value);
    host.querySelector('#contact-quality').textContent = `${signal.quality}%`;
    host.querySelector('#contact-quality-fill').style.width = `${signal.quality}%`;
    host.querySelector('#contact-noise').textContent = `${Math.round(signal.noise)}%`;
    host.querySelector('#contact-lock').disabled = !signal.lockReady || selectedContact.locked;
    host.querySelector('#contact-lock').textContent = selectedContact.locked ? 'SIGNAL LOCKED' : signal.lockReady ? 'LOCK SIGNAL' : 'TUNE TO LOCK';
    host.querySelector('#phase-readout').textContent = `${phaseSlider.value}°`;
    host.querySelector('#elevation-readout').textContent = `${elevationSlider.value}°`;
  }

  function show(contact, elapsedSeconds = 0) {
    selectedContact = contact;
    host.hidden = false;
    host.innerHTML = `
      <div class="telemetry-head"><div><div class="section-kicker">ORBITAL CONTACT / LIVE TELEMETRY</div><h2>${contact.name}</h2></div><button class="icon-button telemetry-close" id="telemetry-close" aria-label="Close telemetry">×</button></div>
      <div class="contact-status ${contact.locked ? 'locked' : ''}"><i></i><b>${contact.locked ? 'SIGNAL LOCKED' : 'NOMINAL'}</b><span>UPLINK AVAILABLE</span></div>
      <div class="telemetry-stats"><div><span>LATITUDE</span><b id="contact-lat">—</b></div><div><span>LONGITUDE</span><b id="contact-lon">—</b></div><div><span>ALTITUDE</span><b>${contact.altitude} <small>KM</small></b></div><div><span>VELOCITY</span><b id="contact-velocity">—</b></div><div><span>ORBIT PERIOD</span><b>${contact.period} <small>MIN</small></b></div><div><span>SIGNAL PING</span><b id="contact-ping">—</b></div></div>
      <div class="orbit-vector"><div class="vector-track"><svg viewBox="0 0 260 54" aria-hidden="true"><path d="M4 38C40 7 75 6 106 30s63 27 92 1 42-22 58-16"/><path class="vector-line" d="M4 38C40 7 75 6 106 30s63 27 92 1 42-22 58-16"/><circle id="vector-dot" cx="12" cy="32" r="4"/></svg><span>LIVE VECTOR PATH / INCLINATION ${contact.inclination.toFixed(1)}°</span></div><span class="vector-direction">↗ ASCENDING</span></div>
      <div class="tune-panel"><div class="tune-heading"><div><div class="section-kicker">MINIGAME / SIGNAL ACQUISITION</div><h3>Align the uplink.</h3></div><span class="signal-readout" id="contact-quality">0%</span></div><p>Follow the carrier target. Atmospheric noise shifts the lock window.</p><div class="target-line"><span>BEACON TARGET</span><b>${contact.targetPhase}° PHASE <i>·</i> ${contact.targetElevation}° ELEVATION</b></div>
        <label class="tune-slider"><span>ANTENNA PHASE</span><input id="phase-slider" type="range" min="0" max="359" value="8"/><b id="phase-readout">8°</b></label><label class="tune-slider"><span>ELEVATION</span><input id="elevation-slider" type="range" min="0" max="90" value="8"/><b id="elevation-readout">8°</b></label><div class="noise-meter"><span>ATMOSPHERIC NOISE</span><b id="contact-noise">—</b><div class="quality-track"><i id="contact-quality-fill"></i></div></div><button class="action primary" id="contact-lock" disabled>TUNE TO LOCK <span class="arrow">↗</span></button><div class="tune-feedback" id="tune-feedback">Adjust antenna phase and elevation to acquire the carrier.</div>
      </div>`;
    host.querySelector('#telemetry-close').addEventListener('click', () => { host.hidden = true; selectedContact = null; onClose?.(); });
    host.querySelector('#phase-slider').addEventListener('input', renderSignalReadout);
    host.querySelector('#elevation-slider').addEventListener('input', renderSignalReadout);
    host.querySelector('#contact-lock').addEventListener('click', () => {
      if (selectedContact?.locked) return;
      selectedContact.locked = true;
      host.querySelector('.contact-status')?.classList.add('locked');
      host.querySelector('.contact-status b')?.replaceChildren(document.createTextNode('SIGNAL LOCKED'));
      host.querySelector('#tune-feedback').textContent = 'Carrier acquired. Telemetry link authenticated.';
      host.querySelector('#contact-lock').textContent = 'SIGNAL LOCKED';
      host.querySelector('#contact-lock').disabled = true;
      onLock?.(selectedContact);
    });
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
