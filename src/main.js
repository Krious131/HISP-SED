import './styles.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { initCipherRange, tutorialWasSeen } from './cipher-game.js';
import { createSatelliteInterface } from './satellite-interface.js';

const ships = [
  { id: 'aim', name: 'AIM', full: 'Aeronomy of Ice in the Mesosphere', type: 'Atmospheric science', file: '/models/aim.glb', hue: 'cyan' },
  { id: 'acrim-a', name: 'ACRIMSAT · A', full: 'Active Cavity Radiometer Irradiance Monitor', type: 'Solar irradiance', file: '/models/acrimsat-a.glb', hue: 'gold' },
  { id: 'acrim-b', name: 'ACRIMSAT · B', full: 'Active Cavity Radiometer Irradiance Monitor', type: 'Solar irradiance', file: '/models/acrimsat-b.glb', hue: 'blue' },
];

document.querySelector('#app').innerHTML = `
  <main class="experience">
    <video id="camera-feed" autoplay muted playsinline aria-hidden="true"></video>
    <canvas id="space-canvas" aria-label="Interactive 3D space scene"></canvas>
    <div class="vignette" aria-hidden="true"></div>
    <div class="contact-markers" id="contact-markers" aria-label="Selectable orbital contacts"></div>
    <header class="topbar">
      <a class="brand" href="#home" aria-label="HISP-SED home"><span class="brand-icon">HS</span><span>HISP-SED<small>ORBITAL OPERATIONS</small></span></a>
      <div class="live"><i></i> ORBITAL NETWORK <span class="divider">/</span> LIVE</div>
      <div class="header-right"><button class="quiet-button replay-intro" id="intro-replay">INTRO</button><span class="level-chip">LV <b id="level">01</b></span><span class="xp-chip"><b id="xp">0</b> XP</span><button class="motion-toggle" id="motion-toggle" aria-label="Enable phone motion controls" aria-pressed="false" title="Enable phone motion controls">◉ <span>MOTION</span></button><button class="motion-toggle camera-toggle" id="camera-toggle" aria-label="Start live camera background" aria-pressed="false" title="Show the live camera behind the space overlay">▧ <span>CAMERA</span></button><button class="icon-button" id="fullscreen" aria-label="Toggle fullscreen" title="Toggle fullscreen">⛶</button></div>
    </header>
    <button class="tool-dock-toggle" id="tools-toggle" aria-expanded="false" aria-controls="ship-panel"><span>☷</span><b>SPACECRAFT</b></button>
    <section class="ship-panel glass drawer-closed" id="ship-panel" aria-label="Spacecraft selector">
      <div class="drawer-heading"><div><div class="section-kicker">FLEET / 03</div><h1>Select a<br /><em>spacecraft.</em></h1></div><button class="icon-button drawer-close" id="tools-close" aria-label="Close spacecraft selector">×</button></div>
      <p class="muted intro">Choose a vehicle to inspect in the live orbital scene.</p>
      <div id="ship-list" class="ship-list"></div>
      <div class="contact-selector"><div class="section-kicker">ORBITAL CONTACTS / 03</div><div id="contact-list" class="contact-list"></div></div>
      <div class="control-hint"><span class="mouse-glyph">↗</span><span><b>DRAG</b> orbit <i>·</i> <b>PINCH</b> zoom<br /><small>Tap a satellite to inspect its telemetry</small></span></div>
    </section>
    <button class="cipher-launch" id="cipher-launch"><span>⌘</span><span><b>CIPHER RANGE</b><small id="cipher-launch-status">SATELLITE UPLINKS · 0/3</small></span><i>↗</i></button>
    <aside class="telemetry-card glass" id="telemetry-card" hidden aria-live="polite"></aside>
    <div class="scene-caption"><span class="caption-mark">◎</span><div><b id="ship-caption">AIM · SCIENCE ORBITER</b><small>SELECT AN ORBITAL CONTACT</small></div></div>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
    <div class="loading" id="loading"><span class="loader"></span><b>INITIALIZING ORBIT</b><small>Loading local spacecraft and Earth imagery…</small></div>
    <footer class="bottom-note">FREE FLIGHT <span>·</span> DRAG TO EXPLORE <span>·</span> NO MARKER REQUIRED</footer>
  </main>`;

document.querySelector('#app').insertAdjacentHTML('beforeend', `
  <section class="cipher-view" id="cipher-view" aria-label="Cipher training range" hidden>
    <header class="cipher-topbar"><a class="brand" href="#home"><span class="brand-icon">SC</span><span>SPACE <b>CYPHER</b><small>TRAINING RANGE / 01</small></span></a><div class="cipher-top-actions"><span class="cipher-xp"><b id="cipher-xp">0</b> XP</span><button class="quiet-button" id="tutorial-open">HOW TO PLAY</button><button class="icon-button" id="cipher-close" aria-label="Return to orbit">×</button></div></header>
    <div class="cipher-gate" id="cipher-gate" hidden><article class="cipher-gate-card"><div class="section-kicker">MISSION ACCESS / <span id="cipher-gate-count">0 OF 3</span> SATELLITE UPLINKS</div><h1>Unlock one <em>message.</em></h1><p>Connect all three satellites to open the cipher transmission.</p><ol><li><b>Choose a satellite</b><span>Open SPACECRAFT, then select one orbital contact.</span></li><li><b>Turn its antenna dial</b><span>Move the dial toward the displayed beacon target. It locks automatically when close.</span></li><li><b>Repeat for all three</b><span>When all three links are locked, CIPHER RANGE opens with one message to decode.</span></li></ol><div class="gate-progress"><i id="cipher-gate-progress"></i></div><button class="action primary" id="gate-return">RETURN TO ORBIT <span class="arrow">↗</span></button></article></div>
    <div class="cipher-content" id="cipher-content" hidden>
      <div class="cipher-intro"><div><div class="section-kicker">SIGNAL INTERCEPT / ONE MESSAGE</div><h1>Decode the <em>signal.</em></h1><p>Turn one dial, watch the live preview change, and reach the marked setting to decode the message.</p></div><div class="training-badge"><span>TRAINING ONLY</span><small>CLASSICAL CIPHERS ARE NOT SECURE</small></div></div>
      <div class="tier-tabs single-message-tab"><span>UNLOCKED TRANSMISSION</span><b>ONE MESSAGE · ROTATION DIAL</b><i id="single-message-state">READY</i></div>
      <div class="cipher-grid">
        <article class="cipher-card cipher-puzzle-card"><div class="card-kicker"><span id="puzzle-tier-label">TIER 01 / ROTATION WHEEL</span><span class="signal-state"><i></i> INTERCEPTED</span></div><div class="puzzle-meta"><div><div class="section-kicker">INCOMING TRANSMISSION</div><h2 id="puzzle-title">Restore the signal.</h2></div><span class="cipher-difficulty" id="cipher-difficulty">ENTRY</span></div><p class="puzzle-description" id="puzzle-description"></p>
          <div class="ciphertext-box"><div><span>ENCRYPTED PAYLOAD</span><b id="ciphertext-label">—</b></div><div class="cipher-tools"><button id="hint-button" class="text-button">NEED A CLUE?</button><button id="new-challenge" class="text-button" title="Restart this puzzle">↻ RESET</button></div></div>
          <div class="key-workbench"><div class="key-workbench-head"><div><div class="section-kicker" id="key-title">ROTATION WHEEL</div><strong id="key-summary">ALIGN THE ALPHABET RINGS</strong></div><span class="key-value" id="key-value">+00</span></div>
            <div class="wheel-stage" id="wheel-stage"><div class="wheel-ring outer-ring" id="wheel-outer"></div><div class="wheel-core"><span>A</span><i>↕</i><b id="wheel-match">A</b></div><div class="wheel-ring inner-ring" id="wheel-inner"></div></div>
            <label class="slider-line" id="rotation-control"><span>ROTATION</span><input id="rotation-slider" type="range" min="0" max="25" value="0" /><b id="rotation-value">0</b></label>
            <div class="rail-controls" id="rail-controls" hidden><label class="slider-line"><span>RAILS</span><input id="rail-slider" type="range" min="2" max="4" value="2" /><b id="rail-value">2</b></label><div class="rail-trace" id="rail-trace"></div></div>
            <div class="layer-controls" id="layer-controls" hidden><label class="field-label" for="key-one">KEY A · PRELOADED</label><input class="cipher-input" id="key-one" maxlength="10" placeholder="AUTO-LOADED" autocomplete="off" readonly /><label class="slider-line"><span>KEY B · SHIFT</span><input id="layer-shift" type="range" min="0" max="25" value="0" /><b id="layer-shift-value">0</b></label></div>
          </div>
          <label class="field-label" for="decode-answer">DECODED MESSAGE <span>AUTO-FILLS AT TARGET</span></label><input class="cipher-input answer-input" id="decode-answer" placeholder="Move the dial to reveal the message" autocomplete="off" readonly />
          <div class="puzzle-actions"><button class="action primary" id="submit-answer">CHECK DIAL <span class="arrow">↗</span></button><span class="puzzle-reward">+<b id="tier-reward">50</b> XP</span></div><div class="cipher-result" id="cipher-result" aria-live="polite">Move the dial to its target. The message decodes automatically.</div>
          <div class="return-signal" id="return-signal" hidden><div class="return-heading"><div><div class="section-kicker">RETURN CHANNEL</div><h3>Encode a reply.</h3></div><span>KEYED</span></div><div class="return-row"><input class="cipher-input" id="return-message" maxlength="36" value="RETURN TO BASE" aria-label="Reply message" /><button class="action secondary" id="encode-reply">ENCODE</button></div><div class="reply-output" id="reply-output" hidden></div></div>
        </article>
        <aside class="cipher-side"><article class="cipher-card cipher-guide"><div class="card-kicker"><span>FIELD NOTES</span><span class="note-mark">✳</span></div><h3 id="mechanic-title">A letter can orbit.</h3><p id="mechanic-copy"></p><div class="micro-example" id="micro-example"></div><div class="tier-progress"><div><span>TRAINING CLEARANCE</span><b id="tier-progress-text">0 / 3</b></div><div class="progress-track"><i id="tier-progress-fill"></i></div></div></article>
          <article class="cipher-card secure-card"><div class="card-kicker"><span>SECURE LINK / AES-256-GCM</span><span class="secure-dot"><i></i> LOCAL</span></div><h3>Seal a real packet.</h3><p>This browser demonstration uses authenticated encryption. The key stays in this page.</p><textarea id="secure-message" rows="2" maxlength="120">ORBITAL TELEMETRY RECEIVED</textarea><div class="secure-actions"><button class="action primary" id="secure-seal">SEAL PACKET <span class="arrow">↗</span></button><button class="icon-button" id="secure-open" aria-label="Decrypt packet" title="Decrypt packet" disabled>⌕</button></div><div class="secure-packet" id="secure-packet" hidden></div><div class="secure-result" id="secure-result" aria-live="polite">AES-GCM authenticates the message and rejects altered data.</div><button class="tamper-button" id="secure-tamper" disabled>↯ TEST TAMPER DETECTION <span>+25 XP</span></button></article>
        </aside>
      </div>
    </div>
    <div class="tutorial-scrim" id="tutorial-scrim" hidden><section class="tutorial-card" role="dialog" aria-modal="true" aria-labelledby="tutorial-title"><div class="tutorial-top"><span class="section-kicker">CIPHER RANGE / ORIENTATION</span><button class="text-button" id="tutorial-skip">SKIP</button></div><div class="tutorial-illustration" id="tutorial-illustration">◎</div><div class="tutorial-step" id="tutorial-step">01 / 03</div><h2 id="tutorial-title">Signals are puzzles.</h2><p id="tutorial-copy"></p><div class="tutorial-footer"><div class="tutorial-dots"><i class="active"></i><i></i><i></i></div><button class="action primary" id="tutorial-next">CONTINUE <span class="arrow">↗</span></button></div></section></div>
  </section>
  <section class="launch-intro" id="launch-intro" aria-label="HISP-SED launch sequence" hidden><div class="launch-stars"></div><div class="launch-copy"><span class="section-kicker">HISP-SED / MISSION ZERO</span><div class="countdown" id="countdown">T − 03</div><h1>All systems<br /><em>go.</em></h1><p>Telemetry is green. Your orbital network is waiting.</p></div><div class="launch-horizon"><div class="launch-glow"></div><div class="rocket" aria-hidden="true"><svg class="rocket-art" viewBox="0 0 120 360" role="presentation"><defs><linearGradient id="rocketHull" x1="0" x2="1"><stop stop-color="#8296a9"/><stop offset=".18" stop-color="#edf4f8"/><stop offset=".48" stop-color="#fff"/><stop offset=".78" stop-color="#d5e0e8"/><stop offset="1" stop-color="#8296a9"/></linearGradient><linearGradient id="rocketShadow" x1="0" x2="1"><stop stop-color="#71879a"/><stop offset=".5" stop-color="#c5d2dc"/><stop offset="1" stop-color="#607589"/></linearGradient><linearGradient id="rocketFire" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#fffbd0"/><stop offset=".24" stop-color="#ffc85d"/><stop offset=".62" stop-color="#ff733d"/><stop offset="1" stop-color="#e940ff" stop-opacity="0"/></linearGradient><radialGradient id="rocketWindow"><stop stop-color="#c7f8ff"/><stop offset=".56" stop-color="#36c7ed"/><stop offset="1" stop-color="#11456d"/></radialGradient></defs><g class="rocket-plume"><path d="M45 260 Q60 286 60 350 Q39 314 45 260Z" fill="url(#rocketFire)"/><path d="M75 260 Q60 286 60 350 Q81 314 75 260Z" fill="url(#rocketFire)"/><path d="M54 260 Q60 279 60 326 Q49 295 54 260Z" fill="#fff8c7" opacity=".92"/></g><path d="M42 220 L20 254 L20 272 L48 258 M78 220 L100 254 L100 272 L72 258" fill="#b74436" stroke="#f09162" stroke-width="2"/><path d="M44 239 L37 265 L48 260 M76 239 L83 265 L72 260" fill="#e77e50"/><path d="M43 82 Q43 42 60 15 Q77 42 77 82 L77 244 Q60 255 43 244Z" fill="url(#rocketHull)" stroke="#f6fbff" stroke-width="1.5"/><path d="M44 81 Q60 76 76 81 L76 96 Q60 91 44 96Z" fill="#d74e3d"/><path d="M45 105 L75 105 L75 216 Q60 221 45 216Z" fill="#f6f8fa"/><path d="M45 219 Q60 224 75 219 L75 245 Q60 253 45 245Z" fill="url(#rocketShadow)"/><path d="M47 107 L49 209" stroke="#fff" stroke-width="2" opacity=".55"/><circle cx="60" cy="132" r="10" fill="#172f43" stroke="#e7a94f" stroke-width="3"/><circle cx="60" cy="132" r="6.5" fill="url(#rocketWindow)"/><path d="M55 130 Q59 125 64 129" fill="none" stroke="#eaffff" stroke-width="1.5" opacity=".8"/><path d="M51 159 H69 M51 166 H69 M51 173 H69" stroke="#9baaba" stroke-width="2"/><path d="M48 190 H72" stroke="#cf493a" stroke-width="4"/><path d="M39 238 H81" stroke="#7c8c99" stroke-width="5"/><path d="M47 245 H73 L69 262 H51Z" fill="#4b5b68"/><path d="M50 260 H70" stroke="#f5d28a" stroke-width="3"/><path d="M40 83 H80" stroke="#93a2ae" stroke-width="3"/><path d="M56 79 V52" stroke="#d8e2e8" stroke-width="2"/><path d="M58 66 H62" stroke="#d74e3d" stroke-width="7"/></svg></div><div class="launch-ground"></div></div><button class="skip-launch" id="skip-launch">SKIP INTRO <span>↗</span></button><div class="launch-wordmark">HISP-SED<small>ORBITAL MISSION SYSTEMS</small></div></section>`);

const canvas = document.querySelector('#space-canvas');
const cameraFeed = document.querySelector('#camera-feed');
const cameraToggle = document.querySelector('#camera-toggle');
const experience = document.querySelector('.experience');
const shipPanel = document.querySelector('#ship-panel');
const telemetryCard = document.querySelector('#telemetry-card');
const cipherView = document.querySelector('#cipher-view');
document.querySelector('#tools-toggle').addEventListener('click', () => { shipPanel.classList.toggle('drawer-closed'); document.querySelector('#tools-toggle').setAttribute('aria-expanded', String(!shipPanel.classList.contains('drawer-closed'))); });
document.querySelector('#tools-close').addEventListener('click', () => { shipPanel.classList.add('drawer-closed'); document.querySelector('#tools-toggle').setAttribute('aria-expanded', 'false'); });

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.13;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const spaceBackground = new THREE.Color('#030712');
const spaceFog = new THREE.FogExp2('#030712', 0.0016);
scene.background = spaceBackground;
scene.fog = spaceFog;
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 550);
camera.position.set(0, 1.8, 13.7);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 5.2;
controls.maxDistance = 27;
controls.maxPolarAngle = Math.PI * 0.82;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.32;

// Phone orientation adds a calibrated view offset while OrbitControls stays active underneath.
// Thus mouse/touch drag and zoom continue to work exactly as before.
const motionButton = document.querySelector('#motion-toggle');
const deviceEuler = new THREE.Euler();
const deviceQuaternion = new THREE.Quaternion();
const inverseScreenQuaternion = new THREE.Quaternion();
const screenAxis = new THREE.Vector3(0, 0, 1);
const cameraCorrection = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2);
const sensorBaseline = new THREE.Quaternion();
const sensorRelative = new THREE.Quaternion();
const sensorAngles = new THREE.Euler(0, 0, 0, 'YXZ');
const sensorOffset = { yaw: 0, pitch: 0 };
const sensorTarget = { yaw: 0, pitch: 0 };
let motionEnabled = false;
let sensorReady = false;
let sensorEvents = 0;
let screenAngle = 0;
const orientationHandler = (event) => {
  if (event.alpha == null && event.beta == null && event.gamma == null) return;
  sensorEvents++;
  deviceEuler.set(THREE.MathUtils.degToRad(event.beta || 0), THREE.MathUtils.degToRad(event.alpha || 0), -THREE.MathUtils.degToRad(event.gamma || 0), 'YXZ');
  deviceQuaternion.setFromEuler(deviceEuler);
  deviceQuaternion.multiply(cameraCorrection);
  inverseScreenQuaternion.setFromAxisAngle(screenAxis, -THREE.MathUtils.degToRad(screenAngle));
  deviceQuaternion.multiply(inverseScreenQuaternion);
  if (!sensorReady) {
    sensorBaseline.copy(deviceQuaternion);
    sensorReady = true;
    return;
  }
  sensorRelative.copy(sensorBaseline).invert().multiply(deviceQuaternion).normalize();
  sensorAngles.setFromQuaternion(sensorRelative, 'YXZ');
  // Reduce the raw device range, ignore tiny sensor noise, and let the render loop smooth it.
  const yaw = Math.abs(sensorAngles.y) < 0.015 ? 0 : sensorAngles.y * 0.52;
  const pitch = Math.abs(sensorAngles.x) < 0.015 ? 0 : sensorAngles.x * 0.52;
  sensorTarget.yaw = THREE.MathUtils.clamp(yaw, -Math.PI * 0.28, Math.PI * 0.28);
  sensorTarget.pitch = THREE.MathUtils.clamp(pitch, -Math.PI * 0.2, Math.PI * 0.2);
};
const updateScreenAngle = () => {
  screenAngle = Number(window.screen?.orientation?.angle ?? window.orientation ?? 0);
  if (motionEnabled) {
    sensorReady = false;
    sensorOffset.yaw = 0;
    sensorOffset.pitch = 0;
    sensorTarget.yaw = 0;
    sensorTarget.pitch = 0;
  }
};
updateScreenAngle();
window.screen?.orientation?.addEventListener?.('change', updateScreenAngle);
function stopPhoneMotion() {
  window.removeEventListener('deviceorientation', orientationHandler, true);
  motionEnabled = false;
  sensorReady = false;
  sensorEvents = 0;
  sensorOffset.yaw = 0;
  sensorOffset.pitch = 0;
  sensorTarget.yaw = 0;
  sensorTarget.pitch = 0;
  controls.autoRotate = true;
  motionButton.classList.remove('enabled');
  motionButton.setAttribute('aria-pressed', 'false');
  motionButton.setAttribute('aria-label', 'Enable phone motion controls');
  motionButton.title = 'Enable phone motion controls';
  motionButton.innerHTML = '◉ <span>MOTION</span>';
}
motionButton.addEventListener('click', async () => {
  if (motionEnabled) {
    stopPhoneMotion();
    toast('Phone motion off. Drag, scroll, and pinch controls are still available.');
    return;
  }
  if (!('DeviceOrientationEvent' in window)) {
    toast('This browser has no phone orientation sensor. Drag and pinch still work.');
    return;
  }
  try {
    // iOS Safari requires this permission request to happen directly in a button tap.
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') {
        toast('Motion access was not granted. Drag and pinch controls remain available.');
        return;
      }
    }
    updateScreenAngle();
    sensorReady = false;
    sensorEvents = 0;
    sensorOffset.yaw = 0;
    sensorOffset.pitch = 0;
    sensorTarget.yaw = 0;
    sensorTarget.pitch = 0;
    window.addEventListener('deviceorientation', orientationHandler, true);
    motionEnabled = true;
    controls.autoRotate = false;
    motionButton.classList.add('enabled');
    motionButton.setAttribute('aria-pressed', 'true');
    motionButton.setAttribute('aria-label', 'Disable phone motion controls');
    motionButton.title = 'Phone motion controls are on';
    motionButton.innerHTML = '◉ <span>ON</span>';
    setTimeout(() => {
      if (motionEnabled && sensorEvents === 0) {
        stopPhoneMotion();
        toast('No phone motion readings received. Open this on a motion-enabled phone over HTTPS or localhost.');
      } else if (motionEnabled) {
      toast('Phone motion on. Turn slowly to look around; the view is smoothed. Drag and pinch still work.');
      }
    }, 1400);
  } catch (error) {
    console.warn('Phone motion permission could not be enabled:', error);
    toast('Phone motion could not start. Drag and pinch controls are still available.');
  }
});

scene.add(new THREE.HemisphereLight(0xa8ccff, 0x11131d, 1.05));
const sun = new THREE.DirectionalLight(0xffe7c4, 4.1);
sun.position.set(-18, 24, 22);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x579dff, 1.15);
fill.position.set(18, -2, -8);
scene.add(fill);

// Deep field: deterministic-looking stars at varied distances plus subtle colored nebula clouds.
const starCount = 6200;
const starPositions = new Float32Array(starCount * 3);
const starColors = new Float32Array(starCount * 3);
const starSizes = new Float32Array(starCount);
const colorChoices = [new THREE.Color('#ffffff'), new THREE.Color('#93c5fd'), new THREE.Color('#f7d9b1'), new THREE.Color('#becaff')];
for (let i = 0; i < starCount; i++) {
  const radius = 135 + Math.random() * 140;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPositions.set([radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta)], i * 3);
  const c = colorChoices[Math.floor(Math.random() * colorChoices.length)];
  starColors.set([c.r, c.g, c.b], i * 3);
  starSizes[i] = 0.55 + Math.random() * 1.9;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
const starMat = new THREE.PointsMaterial({ size: 0.7, vertexColors: true, transparent: true, opacity: 0.92, sizeAttenuation: true, depthWrite: false });
scene.add(new THREE.Points(starGeo, starMat));

const nebula = new THREE.Mesh(new THREE.SphereGeometry(330, 32, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  vertexShader: `varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `varying vec3 vDir; float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);} float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);} void main(){vec3 d=normalize(vDir); float n=noise(d*5.0)+0.45*noise(d*11.0); float cloud=smoothstep(0.77,1.3,n); vec3 c=mix(vec3(0.008,0.014,0.04),vec3(0.035,0.09,0.21),cloud); c+=vec3(0.10,0.035,0.18)*smoothstep(0.93,1.35,n)*smoothstep(-0.1,0.65,d.x); gl_FragColor=vec4(c,1.0);}`
}));
scene.add(nebula);

// Optional camera passthrough: the space scene becomes transparent so the 3D overlay
// composites over live surroundings. The camera starts only after the user taps the control.
let cameraStream = null;
cameraToggle.addEventListener('click', async () => {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
    cameraFeed.pause();
    cameraFeed.srcObject = null;
    experience.classList.remove('camera-active');
    scene.background = spaceBackground;
    scene.fog = spaceFog;
    nebula.visible = true;
    cameraToggle.classList.remove('enabled');
    cameraToggle.setAttribute('aria-pressed', 'false');
    cameraToggle.setAttribute('aria-label', 'Start live camera background');
    cameraToggle.innerHTML = '▧ <span>CAMERA</span>';
    toast('Live camera off. Space scene restored.');
    return;
  }
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    toast('Camera view requires HTTPS or localhost in a browser that supports camera access.');
    return;
  }
  cameraToggle.disabled = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    cameraFeed.srcObject = stream;
    await cameraFeed.play();
    cameraStream = stream;
    scene.background = null;
    scene.fog = null;
    nebula.visible = false;
    experience.classList.add('camera-active');
    cameraToggle.classList.add('enabled');
    cameraToggle.setAttribute('aria-pressed', 'true');
    cameraToggle.setAttribute('aria-label', 'Stop live camera background');
    cameraToggle.innerHTML = '▧ <span>CAMERA ON</span>';
    toast('Live camera on. Satellite and space graphics are overlaid on your surroundings.');
  } catch (error) {
    console.warn('Live camera could not start:', error);
    cameraFeed.pause();
    cameraFeed.srcObject?.getTracks().forEach((track) => track.stop());
    cameraFeed.srcObject = null;
    toast(error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError'
      ? 'Camera permission is off. Allow camera access for HISP-SED in Android Settings, then try again.'
      : error.name === 'NotFoundError'
        ? 'No camera was found on this device.'
        : error.name === 'NotReadableError'
          ? 'The camera is busy in another app. Close it and try again.'
          : 'Could not start the camera. Check Android camera permission and try again.');
  } finally {
    cameraToggle.disabled = false;
  }
});
window.addEventListener('pagehide', () => cameraStream?.getTracks().forEach((track) => track.stop()));

// NASA Blue Marble base map, bundled locally. Earth is a cinematic scene backdrop, not to scale.
const earthCenter = new THREE.Vector3(0, -25, -76);
const earthRadius = 48;
const earthRig = new THREE.Group();
earthRig.position.copy(earthCenter);
scene.add(earthRig);
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('/textures/earth-blue-marble.jpg');
earthTexture.colorSpace = THREE.SRGBColorSpace;
earthTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
const earth = new THREE.Mesh(new THREE.SphereGeometry(earthRadius, 96, 72), new THREE.MeshStandardMaterial({ map: earthTexture, roughness: 0.92, metalness: 0.02, emissive: new THREE.Color('#07152c'), emissiveIntensity: 0.12 }));
earth.rotation.y = -0.42;
earthRig.add(earth);
const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(earthRadius * 1.026, 96, 64), new THREE.ShaderMaterial({
  side: THREE.BackSide, transparent: true, depthWrite: false,
  vertexShader: `varying vec3 vNormal; varying vec3 vView; void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
  fragmentShader: `varying vec3 vNormal; varying vec3 vView; void main(){float rim=pow(1.0-max(dot(normalize(vNormal),normalize(vView)),0.0),3.2);gl_FragColor=vec4(0.18,0.52,1.0,rim*0.7);}`
}));
earthRig.add(atmosphere);
const groundPoint = earthCenter.clone().add(new THREE.Vector3(0, 0.47, 0.88).normalize().multiplyScalar(earthRadius * 1.006));
const station = new THREE.Group();
station.position.copy(groundPoint);
station.lookAt(earthCenter);
scene.add(station);
const stationBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.23, 0.12, 12), new THREE.MeshStandardMaterial({ color: '#d6e5f5', metalness: 0.7, roughness: 0.28, emissive: '#153e60', emissiveIntensity: 0.3 }));
station.add(stationBase);
const stationBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: '#5df5ff' }));
stationBeacon.position.y = 0.2;
station.add(stationBeacon);
const beaconLight = new THREE.PointLight('#39e7ff', 4, 3);
beaconLight.position.y = 0.2;
station.add(beaconLight);

const shipPivot = new THREE.Group();
scene.add(shipPivot);
const orbitalContacts = [
  { id: 'aurora', name: 'AURORA-4', altitude: 536, period: 94.8, inclination: 51.6, phase: 0.3, radius: 6.4, depth: 4.1, color: '#70eaff', targetPhase: 42, targetElevation: 28, xpClaimed: false },
  { id: 'kepler', name: 'KEPLER-9', altitude: 702, period: 99.2, inclination: 73.2, phase: 2.2, radius: 8.3, depth: 5.3, color: '#ffd48c', targetPhase: 196, targetElevation: 57, xpClaimed: false },
  { id: 'wayfinder', name: 'WAYFINDER-2', altitude: 421, period: 92.1, inclination: 42.8, phase: 4.1, radius: 9.7, depth: 6.2, color: '#a8b9ff', targetPhase: 286, targetElevation: 39, xpClaimed: false },
];
const lockedContacts = new Set(JSON.parse(localStorage.getItem('space-cypher-locked-contacts') || '[]'));
orbitalContacts.forEach((contact) => { contact.locked = lockedContacts.has(contact.id); contact.xpClaimed = contact.locked; });
function updateCipherGate() {
  const count = Math.min(3, lockedContacts.size);
  const unlocked = count >= 3;
  document.querySelector('#cipher-launch-status').textContent = unlocked ? 'ONE MESSAGE UNLOCKED' : `SATELLITE UPLINKS · ${count}/3`;
  document.querySelector('#cipher-gate-count').textContent = `${count} OF 3`;
  document.querySelector('#cipher-gate-progress').style.width = `${(count / 3) * 100}%`;
  document.querySelector('#cipher-gate').hidden = unlocked;
  document.querySelector('#cipher-content').hidden = !unlocked;
  return unlocked;
}
updateCipherGate();
const contactLayer = new THREE.Group();
scene.add(contactLayer);
function createContactModel(contact) {
  const group = new THREE.Group();
  group.userData.contactId = contact.id;
  const bus = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.3), new THREE.MeshStandardMaterial({ color: '#d9e6f4', metalness: 0.76, roughness: 0.28, emissive: contact.color, emissiveIntensity: 0.06 }));
  const panelMaterial = new THREE.MeshStandardMaterial({ color: contact.color, metalness: 0.36, roughness: 0.32, emissive: contact.color, emissiveIntensity: 0.14 });
  group.add(bus);
  for (const side of [-1, 1]) {
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), new THREE.MeshStandardMaterial({ color: '#e9c878', metalness: 0.8, roughness: 0.22 }));
    boom.rotation.z = Math.PI / 2;
    boom.position.x = side * 0.37;
    group.add(boom);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.3, 0.035), panelMaterial);
    panel.position.x = side * 0.77;
    group.add(panel);
    for (let cell = -1; cell <= 1; cell++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.009, 0.041), new THREE.MeshBasicMaterial({ color: '#071b3b' }));
      line.position.set(side * 0.77, cell * 0.085, 0.022);
      group.add(line);
    }
  }
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e9ce8d', metalness: 0.85, roughness: 0.2, side: THREE.DoubleSide }));
  dish.position.y = 0.24;
  dish.rotation.x = Math.PI;
  group.add(dish);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), new THREE.MeshBasicMaterial({ color: contact.color }));
  glow.position.y = -0.25;
  group.add(glow);
  const hitArea = new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, colorWrite: false, depthWrite: false }));
  group.add(hitArea);
  group.scale.setScalar(1.05);
  return group;
}
for (const contact of orbitalContacts) {
  const points = [];
  for (let index = 0; index < 160; index++) {
    const angle = (index / 160) * Math.PI * 2;
    points.push(new THREE.Vector3(contact.radius * Math.cos(angle), Math.sin(angle * 1.4 + contact.phase) * contact.depth * 0.24, contact.depth * Math.sin(angle)));
  }
  const track = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: contact.color, transparent: true, opacity: 0.17, depthWrite: false }));
  contactLayer.add(track);
  contact.group = createContactModel(contact);
  contactLayer.add(contact.group);
}
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
let currentShip = ships[0];
let loadedShip = null;
let xp = Number(localStorage.getItem('orbital-cipher-xp') || 0);
const toast = (message) => {
  const node = document.querySelector('#toast'); node.textContent = message; node.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 3200);
};
const fitModel = (root, maxSize = 4.6) => {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = maxSize / Math.max(size.x, size.y, size.z, 1);
  const wrapper = new THREE.Group();
  wrapper.scale.setScalar(scale);
  wrapper.position.copy(center).multiplyScalar(-scale);
  wrapper.add(root);
  return wrapper;
};
function renderShipCards() {
  document.querySelector('#ship-list').innerHTML = ships.map((ship, index) => `
    <button class="ship-card ${ship.id === currentShip.id ? 'selected' : ''}" data-ship="${ship.id}">
      <span class="ship-index">0${index + 1}</span><span class="ship-symbol ${ship.hue}">${index === 0 ? '◈' : '✣'}</span>
      <span class="ship-copy"><b>${ship.name}</b><small>${ship.type}</small></span><span class="select-mark">↗</span>
    </button>`).join('');
  document.querySelectorAll('[data-ship]').forEach((button) => button.addEventListener('click', () => {
    selectShip(button.dataset.ship);
    shipPanel.classList.add('drawer-closed');
    document.querySelector('#tools-toggle').setAttribute('aria-expanded', 'false');
  }));
}
async function selectShip(id) {
  const ship = ships.find((item) => item.id === id);
  if (!ship || ship.id === currentShip.id && loadedShip) return;
  currentShip = ship;
  renderShipCards();
  document.querySelector('#loading').classList.add('visible');
  try {
    const gltf = await loader.loadAsync(ship.file);
    if (currentShip.id !== ship.id) return;
    const wrapper = fitModel(gltf.scene);
    if (loadedShip) shipPivot.remove(loadedShip);
    loadedShip = wrapper;
    shipPivot.add(wrapper);
    document.querySelector('#ship-caption').textContent = `${ship.name} · ${ship.type.toUpperCase()}`;
    document.querySelector('#loading').classList.remove('visible');
    toast(`${ship.name} ready for inspection.`);
  } catch (error) {
    console.error('Spacecraft could not be loaded:', error);
    document.querySelector('#loading').classList.remove('visible');
    toast(`Could not load ${ship.name}. Check that its GLB file is present in public/models.`);
  }
}
renderShipCards();
selectShip(currentShip.id);

function updateXP(amount) {
  xp += amount;
  localStorage.setItem('orbital-cipher-xp', String(xp));
  document.querySelector('#xp').textContent = xp;
  document.querySelector('#cipher-xp').textContent = xp;
  document.querySelector('#level').textContent = String(Math.floor(xp / 250) + 1).padStart(2, '0');
}
document.querySelector('#xp').textContent = xp;
document.querySelector('#cipher-xp').textContent = xp;
document.querySelector('#level').textContent = String(Math.floor(xp / 250) + 1).padStart(2, '0');

function openCipher() {
  cipherView.hidden = false;
  document.querySelector('#cipher-launch').classList.add('active');
  updateCipherGate();
  if (lockedContacts.size >= 3 && !tutorialWasSeen()) document.querySelector('#tutorial-scrim').hidden = false;
  if (location.hash !== '#cipher') history.pushState({ view: 'cipher' }, '', '#cipher');
}
function closeCipher() {
  cipherView.hidden = true;
  document.querySelector('#cipher-launch').classList.remove('active');
  if (location.hash === '#cipher') history.pushState({ view: 'orbit' }, '', '#home');
}
initCipherRange({ toast, addXP: updateXP });
document.querySelector('#cipher-launch').addEventListener('click', openCipher);
document.querySelector('#cipher-close').addEventListener('click', closeCipher);
window.addEventListener('hashchange', () => {
  if (location.hash === '#cipher') { cipherView.hidden = false; updateCipherGate(); if (lockedContacts.size >= 3 && !tutorialWasSeen()) document.querySelector('#tutorial-scrim').hidden = false; }
  else cipherView.hidden = true;
  document.querySelector('#cipher-launch').classList.toggle('active', location.hash === '#cipher');
});
document.querySelector('#gate-return').addEventListener('click', closeCipher);
if (location.hash === '#cipher') { cipherView.hidden = false; updateCipherGate(); if (lockedContacts.size >= 3 && !tutorialWasSeen()) document.querySelector('#tutorial-scrim').hidden = false; }

const satelliteInterface = createSatelliteInterface({
  host: telemetryCard,
  onLock: (contact) => {
    lockedContacts.add(contact.id);
    localStorage.setItem('space-cypher-locked-contacts', JSON.stringify([...lockedContacts]));
    updateCipherGate();
    if (!contact.xpClaimed) { contact.xpClaimed = true; updateXP(75); }
    toast(lockedContacts.size >= 3 ? 'All 3 satellite links locked. One cipher message unlocked.' : `${contact.name} linked · ${lockedContacts.size}/3 satellites uplinked.`);
  },
});
const openTelemetry = (contact) => satelliteInterface.show(contact, clock.getElapsedTime());
document.querySelector('#contact-list').innerHTML = orbitalContacts.map((contact, index) => `<button class="contact-pick" data-contact="${contact.id}"><i style="--contact-color:${contact.color}"></i><span><b>${contact.name}</b><small>${contact.altitude} KM · ${contact.inclination.toFixed(1)}° INC</small></span><em>↗</em></button>`).join('');
document.querySelectorAll('[data-contact]').forEach((button) => button.addEventListener('click', () => {
  const contact = orbitalContacts.find((item) => item.id === button.dataset.contact);
  if (contact) openTelemetry(contact);
  shipPanel.classList.add('drawer-closed');
  document.querySelector('#tools-toggle').setAttribute('aria-expanded', 'false');
}));
const contactMarkerLayer = document.querySelector('#contact-markers');
contactMarkerLayer.innerHTML = orbitalContacts.map((contact) => `<button class="contact-marker" data-contact-marker="${contact.id}" aria-label="Inspect ${contact.name} telemetry"><i style="--contact-color:${contact.color}"></i><span>${contact.name}</span></button>`).join('');
document.querySelectorAll('[data-contact-marker]').forEach((button) => button.addEventListener('click', (event) => {
  event.stopPropagation();
  const contact = orbitalContacts.find((item) => item.id === button.dataset.contactMarker);
  if (contact) openTelemetry(contact);
}));
const projectedContact = new THREE.Vector3();
function updateContactMarkers() {
  for (const contact of orbitalContacts) {
    contact.group.getWorldPosition(projectedContact);
    projectedContact.project(camera);
    const marker = contactMarkerLayer.querySelector(`[data-contact-marker="${contact.id}"]`);
    const visible = projectedContact.z < 1 && projectedContact.z > -1 && Math.abs(projectedContact.x) < 1.2 && Math.abs(projectedContact.y) < 1.2;
    marker.hidden = !visible;
    if (visible) {
      marker.style.left = `${(projectedContact.x + 1) * 50}%`;
      marker.style.top = `${(1 - projectedContact.y) * 50}%`;
    }
  }
}

const pickRay = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
let pointerStart = null;
let pointerDragged = false;
canvas.addEventListener('pointerdown', (event) => { pointerStart = { x: event.clientX, y: event.clientY }; });
canvas.addEventListener('pointermove', (event) => {
  if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 8) pointerDragged = true;
});
canvas.addEventListener('pointerup', () => { setTimeout(() => { pointerStart = null; pointerDragged = false; }, 0); });
canvas.addEventListener('click', (event) => {
  if (pointerDragged) return;
  const bounds = canvas.getBoundingClientRect();
  pointerNdc.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
  pickRay.setFromCamera(pointerNdc, camera);
  const hit = pickRay.intersectObjects(contactLayer.children, true).find((item) => {
    let node = item.object;
    while (node && !node.userData.contactId) node = node.parent;
    return Boolean(node?.userData.contactId);
  });
  if (hit) {
    let node = hit.object;
    while (node && !node.userData.contactId) node = node.parent;
    const contact = orbitalContacts.find((item) => item.id === node.userData.contactId);
    if (contact) openTelemetry(contact);
  }
});
canvas.addEventListener('pointercancel', () => { pointerStart = null; pointerDragged = false; });

const launchIntro = document.querySelector('#launch-intro');
let launchTimer;
function finishLaunch() {
  clearInterval(launchTimer);
  launchIntro.classList.add('launch-exit');
  localStorage.setItem('space-cypher-intro-seen', 'yes');
  setTimeout(() => { launchIntro.hidden = true; launchIntro.classList.remove('launch-exit'); }, 850);
}
function playLaunch() {
  launchIntro.hidden = false;
  launchIntro.classList.remove('launch-exit');
  const counter = document.querySelector('#countdown');
  let count = 3;
  counter.textContent = `T − 0${count}`;
  clearInterval(launchTimer);
  launchTimer = setInterval(() => {
    count--;
    if (count > 0) counter.textContent = `T − 0${count}`;
    else { counter.textContent = 'LIFTOFF'; launchIntro.classList.add('liftoff'); clearInterval(launchTimer); setTimeout(finishLaunch, 2800); }
  }, 900);
}
document.querySelector('#skip-launch').addEventListener('click', finishLaunch);
document.querySelector('#intro-replay').addEventListener('click', playLaunch);
if (localStorage.getItem('space-cypher-intro-seen') !== 'yes') playLaunch();

const updateTelemetry = (elapsed) => satelliteInterface.update(elapsed);

document.querySelector('#fullscreen').addEventListener('click', async () => {
  try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); }
  catch { toast('Fullscreen is unavailable in this browser.'); }
});

const clock = new THREE.Clock();
let telemetryUpdateAt = 0;
const orbitBasePosition = new THREE.Vector3();
const orbitBaseQuaternion = new THREE.Quaternion();
const motionSpherical = new THREE.Spherical();
const motionOrbitOffset = new THREE.Vector3();
function animate() {
  requestAnimationFrame(animate);
  const frameDelta = clock.getDelta();
  const elapsed = clock.elapsedTime;
  earth.rotation.y += 0.00018;
  stationBeacon.scale.setScalar(1 + Math.sin(elapsed * 3) * 0.09);
  if (loadedShip) loadedShip.rotation.y += 0.0011;
  orbitalContacts.forEach((contact, index) => {
    const angle = elapsed * (Math.PI * 2 / (42 + index * 15)) + contact.phase;
    const x = Math.cos(angle) * contact.radius;
    const z = Math.sin(angle) * contact.depth;
    const y = Math.sin(angle * 1.4 + contact.phase) * contact.depth * 0.24;
    contact.group.position.set(x, y, z);
    contact.group.lookAt(x - Math.sin(angle), y, z + Math.cos(angle));
    contact.group.rotateY(Math.PI / 2);
  });
  if (elapsed - telemetryUpdateAt > 0.35) { updateTelemetry(elapsed); telemetryUpdateAt = elapsed; }
  controls.update();
  let restoreOrbitPose = false;
  if (motionEnabled && sensorReady) {
    const smoothing = 1 - Math.exp(-6 * Math.min(frameDelta, 0.05));
    sensorOffset.yaw += (sensorTarget.yaw - sensorOffset.yaw) * smoothing;
    sensorOffset.pitch += (sensorTarget.pitch - sensorOffset.pitch) * smoothing;
    orbitBasePosition.copy(camera.position);
    orbitBaseQuaternion.copy(camera.quaternion);
    motionOrbitOffset.copy(camera.position).sub(controls.target);
    motionSpherical.setFromVector3(motionOrbitOffset);
    motionSpherical.theta += sensorOffset.yaw;
    motionSpherical.phi = THREE.MathUtils.clamp(motionSpherical.phi - sensorOffset.pitch, 0.08, Math.PI - 0.08);
    camera.position.setFromSpherical(motionSpherical).add(controls.target);
    camera.lookAt(controls.target);
    restoreOrbitPose = true;
  }
  renderer.render(scene, camera);
  updateContactMarkers();
  if (restoreOrbitPose) {
    camera.position.copy(orbitBasePosition);
    camera.quaternion.copy(orbitBaseQuaternion);
  }
}
animate();
function resize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
}
window.addEventListener('resize', resize);
window.addEventListener('load', () => document.querySelector('#loading').classList.add('visible'));
earthTexture.addEventListener('load', () => document.querySelector('#loading').classList.remove('visible'));
