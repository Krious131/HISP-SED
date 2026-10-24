import { buildCipherChallenge, caesar, decodeChallenge, normalizeSignal, railFenceEncode, vigenere } from './cipher-engine.js';
import { openPacket, sealPacket, verifyTamperRejection } from './secure-packet.js';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const lessons = [
  { icon: '◎', title: 'Signals are puzzles.', copy: 'Each intercepted message has a rule. Tune the visual key first, then restore the plaintext and verify the result.' },
  { icon: '↻', title: 'The key changes the route.', copy: 'Start with a rotation wheel. Later tiers shuffle letter positions or stack two keys. Watch the field notes as you work.' },
  { icon: '⌑', title: 'Seal the real link.', copy: 'Training ciphers are deliberately simple. The AES-256-GCM panel uses authenticated encryption and detects tampering.' },
];

export function tutorialWasSeen() { return localStorage.getItem('space-cypher-tutorial-seen') === 'yes'; }

export function initCipherRange({ toast, addXP }) {
  const $ = (selector) => document.querySelector(selector);
  let tier = 1;
  let challenge = buildCipherChallenge(tier);
  let packet = null;
  let tutorialIndex = 0;
  let highestUnlocked = Math.max(1, Number(localStorage.getItem('space-cypher-unlocked') || 1));
  let cleared = new Set(JSON.parse(localStorage.getItem('space-cypher-cleared') || '[]'));

  function renderWheel() {
    const outer = $('#wheel-outer');
    const inner = $('#wheel-inner');
    const shift = Number($('#rotation-slider').value);
    const nodes = (letters, target) => {
      target.replaceChildren();
      [...letters].forEach((letter, index) => {
        const angle = (index / 26) * Math.PI * 2 - Math.PI / 2;
        const label = document.createElement('span');
        label.textContent = letter;
        label.style.left = `${50 + Math.cos(angle) * 45}%`;
        label.style.top = `${50 + Math.sin(angle) * 45}%`;
        target.append(label);
      });
    };
    nodes(alphabet, outer);
    nodes(alphabet, inner);
    inner.style.transform = `rotate(${shift * (360 / 26)}deg)`;
    $('#wheel-match').textContent = alphabet[shift];
  }

  function renderRailTrace() {
    const rails = Number($('#rail-slider').value);
    const count = normalizeSignal(challenge.ciphertext).length;
    const route = [];
    let row = 0;
    let direction = 1;
    for (let index = 0; index < count; index++) {
      route.push(row);
      if (row === 0) direction = 1;
      else if (row === rails - 1) direction = -1;
      row += direction;
    }
    const counts = Array(rails).fill(0);
    route.forEach((rail) => counts[rail]++);
    let cursor = 0;
    $('#rail-trace').innerHTML = counts.map((amount, index) => {
      const band = challenge.ciphertext.slice(cursor, cursor + amount);
      cursor += amount;
      return `<div class="rail-band"><span>R${index + 1}</span><b>${band.split('').join(' ')}</b></div>`;
    }).join('');
  }

  function renderTierTabs() {
    document.querySelectorAll('.tier-tab').forEach((button) => {
      const index = Number(button.dataset.tier);
      button.classList.toggle('active', index === tier);
      button.classList.toggle('cleared', cleared.has(index));
      button.disabled = index > highestUnlocked;
      button.querySelector('i').textContent = cleared.has(index) ? 'CLEARED' : index <= highestUnlocked ? 'READY' : 'LOCKED';
    });
    const count = cleared.size;
    $('#tier-progress-text').textContent = `${count} / 3`;
    $('#tier-progress-fill').style.width = `${(count / 3) * 100}%`;
  }

  function loadTier(nextTier) {
    if (nextTier > highestUnlocked) return;
    tier = nextTier;
    challenge = buildCipherChallenge(tier);
    const settings = {
      1: {
        label: 'TIER 01 / ROTATION WHEEL', title: 'Restore the signal.', difficulty: 'ENTRY', reward: 50,
        description: 'Each letter moved the same number of places around the alphabet. Turn the wheel backwards to read the message.',
        mechanicTitle: 'A letter can orbit.', mechanicCopy: 'The ring shifts every symbol by a fixed number. If A maps to E, the key moved each letter four steps forward during encryption.', example: 'A  →  E  ·  B  →  F', keyTitle: 'ROTATION WHEEL', keySummary: 'ALIGN THE ALPHABET RINGS',
      },
      2: {
        label: 'TIER 02 / RAIL FENCE', title: 'Rebuild the sequence.', difficulty: 'INTERMEDIATE', reward: 100,
        description: 'The letters stayed the same, but their positions were scrambled along a zig-zag rail. Set the rail count, then read the path.',
        mechanicTitle: 'Order is the hidden key.', mechanicCopy: 'A rail fence writes a message diagonally, then reads each row. The bands below show how the intercepted letters were grouped.', example: 'R1 → R2 → R3  /  read the zig-zag', keyTitle: 'TRANSPOSITION RAILS', keySummary: 'CHOOSE THE NUMBER OF RAILS',
      },
      3: {
        label: 'TIER 03 / DUAL KEY CASCADE', title: 'Unwrap two key layers.', difficulty: 'ADVANCED', reward: 150,
        description: 'Two transformations protect this signal. Reverse the numeric shift first, then enter the repeating keyword to restore each letter.',
        mechanicTitle: 'Two keys, one message.', mechanicCopy: 'The numeric key is removed first. Then a repeating Vigenère keyword reverses a different shift for each letter.', example: 'KEY A: repeating word  ·  KEY B: rotation', keyTitle: 'LAYERED KEY CASCADE', keySummary: 'REVERSE KEY B, THEN KEY A',
      },
    }[tier];
    $('#puzzle-tier-label').textContent = settings.label;
    $('#puzzle-title').textContent = settings.title;
    $('#puzzle-description').textContent = settings.description;
    $('#cipher-difficulty').textContent = settings.difficulty;
    $('#tier-reward').textContent = settings.reward;
    $('#mechanic-title').textContent = settings.mechanicTitle;
    $('#mechanic-copy').textContent = settings.mechanicCopy;
    $('#micro-example').textContent = settings.example;
    $('#key-title').textContent = settings.keyTitle;
    $('#key-summary').textContent = settings.keySummary;
    $('#ciphertext-label').textContent = challenge.ciphertext;
    $('#decode-answer').value = '';
    $('#key-one').value = '';
    $('#rotation-slider').value = '0';
    $('#rail-slider').value = '2';
    $('#layer-shift').value = '0';
    $('#cipher-result').className = 'cipher-result';
    $('#cipher-result').textContent = 'Tune the key, then submit the decoded transmission.';
    $('#return-signal').hidden = true;
    $('#reply-output').hidden = true;
    $('#wheel-stage').hidden = tier !== 1;
    $('#rotation-control').hidden = tier !== 1;
    $('#rail-controls').hidden = tier !== 2;
    $('#layer-controls').hidden = tier !== 3;
    $('#key-value').textContent = tier === 1 ? '+00' : tier === 2 ? '02 RAILS' : '2 LAYERS';
    $('#rotation-value').textContent = '0';
    $('#rail-value').textContent = '2';
    $('#layer-shift-value').textContent = '0';
    renderWheel();
    renderRailTrace();
    renderTierTabs();
  }

  function currentKeys() {
    if (tier === 1) return [Number($('#rotation-slider').value), ''];
    if (tier === 2) return [Number($('#rail-slider').value), ''];
    return [$('#key-one').value.trim(), Number($('#layer-shift').value)];
  }

  function encodeReply(text) {
    const [keyOne, keyTwo] = currentKeys();
    if (tier === 1) return caesar(text.toUpperCase(), Number(keyOne));
    if (tier === 2) return railFenceEncode(text, Number(keyOne));
    if (!keyOne) return '';
    return caesar(vigenere(text.toUpperCase(), keyOne), Number(keyTwo));
  }

  function updateKeyReadout() {
    const [keyOne, keyTwo] = currentKeys();
    if (tier === 1) {
      $('#rotation-value').textContent = keyOne;
      $('#key-value').textContent = `+${String(keyOne).padStart(2, '0')}`;
      $('#wheel-inner').style.transform = `rotate(${keyOne * (360 / 26)}deg)`;
      $('#wheel-match').textContent = alphabet[keyOne];
    } else if (tier === 2) {
      $('#rail-value').textContent = keyOne;
      $('#key-value').textContent = `${keyOne} RAILS`;
      renderRailTrace();
    } else {
      $('#layer-shift-value').textContent = keyTwo;
      $('#key-value').textContent = keyOne ? `${keyOne.toUpperCase()} / +${keyTwo}` : '2 LAYERS';
    }
  }

  function submitAnswer() {
    const answer = normalizeSignal($('#decode-answer').value);
    const [keyOne, keyTwo] = currentKeys();
    if (!answer) {
      $('#cipher-result').className = 'cipher-result warning';
      $('#cipher-result').textContent = 'Enter the restored signal to verify it.';
      return;
    }
    if (tier === 3 && !normalizeSignal(keyOne)) {
      $('#cipher-result').className = 'cipher-result warning';
      $('#cipher-result').textContent = 'Enter Key A before attempting the layered message.';
      return;
    }
    const restored = decodeChallenge(challenge, keyOne, keyTwo);
    if (answer !== normalizeSignal(challenge.plaintext) || normalizeSignal(restored) !== normalizeSignal(challenge.plaintext)) {
      $('#cipher-result').className = 'cipher-result warning';
      $('#cipher-result').textContent = 'The signal is still garbled. Adjust the key and try again.';
      return;
    }
    const firstClear = !cleared.has(tier);
    cleared.add(tier);
    if (tier < 3) highestUnlocked = Math.max(highestUnlocked, tier + 1);
    localStorage.setItem('space-cypher-cleared', JSON.stringify([...cleared]));
    localStorage.setItem('space-cypher-unlocked', String(highestUnlocked));
    $('#cipher-result').className = 'cipher-result success';
    $('#cipher-result').innerHTML = `<b>TRANSMISSION RESTORED</b><span>${challenge.plaintext} · ${firstClear ? `+${{ 1: 50, 2: 100, 3: 150 }[tier]} XP` : 'tier already cleared'}</span>`;
    if (firstClear) addXP({ 1: 50, 2: 100, 3: 150 }[tier]);
    $('#return-signal').hidden = false;
    $('#reply-output').hidden = true;
    $('#return-message').value = 'RETURN TO BASE';
    renderTierTabs();
    toast(firstClear ? 'Signal restored. Next cipher tier unlocked.' : 'Signal restored. Tier already cleared.');
  }

  function showTutorial(index = 0) {
    tutorialIndex = index;
    const item = lessons[index];
    $('#tutorial-scrim').hidden = false;
    $('#tutorial-illustration').textContent = item.icon;
    $('#tutorial-step').textContent = `${String(index + 1).padStart(2, '0')} / 03`;
    $('#tutorial-title').textContent = item.title;
    $('#tutorial-copy').textContent = item.copy;
    document.querySelectorAll('.tutorial-dots i').forEach((dot, i) => dot.classList.toggle('active', i === index));
    $('#tutorial-next').innerHTML = index === lessons.length - 1 ? 'START TRAINING <span class="arrow">↗</span>' : 'CONTINUE <span class="arrow">↗</span>';
  }

  function closeTutorial() {
    $('#tutorial-scrim').hidden = true;
    localStorage.setItem('space-cypher-tutorial-seen', 'yes');
    $('#decode-answer').focus({ preventScroll: true });
  }

  document.querySelectorAll('.tier-tab').forEach((button) => button.addEventListener('click', () => loadTier(Number(button.dataset.tier))));
  $('#rotation-slider').addEventListener('input', updateKeyReadout);
  $('#rail-slider').addEventListener('input', updateKeyReadout);
  $('#layer-shift').addEventListener('input', updateKeyReadout);
  $('#key-one').addEventListener('input', updateKeyReadout);
  $('#submit-answer').addEventListener('click', submitAnswer);
  $('#decode-answer').addEventListener('keydown', (event) => { if (event.key === 'Enter') submitAnswer(); });
  $('#new-challenge').addEventListener('click', () => loadTier(tier));
  $('#hint-button').addEventListener('click', () => {
    const hint = tier === 1 ? 'Clue: the first plaintext letter S became W. The wheel moved four positions forward.'
      : tier === 2 ? 'Clue: the signal uses three rails. Read the letters back along the diagonal route.'
        : 'Clue: reverse Key B (+2) first, then use the repeating Key A word LUNA.';
    $('#cipher-result').className = 'cipher-result hint';
    $('#cipher-result').textContent = hint;
  });
  $('#encode-reply').addEventListener('click', () => {
    const message = $('#return-message').value.trim();
    const encoded = encodeReply(message);
    if (!message || !encoded) { toast('Add a key and reply text to encode the return signal.'); return; }
    $('#reply-output').hidden = false;
    $('#reply-output').textContent = encoded;
  });
  $('#tutorial-open').addEventListener('click', () => showTutorial());
  $('#tutorial-next').addEventListener('click', () => tutorialIndex < lessons.length - 1 ? showTutorial(tutorialIndex + 1) : closeTutorial());
  $('#tutorial-skip').addEventListener('click', closeTutorial);
  $('#tutorial-scrim').addEventListener('click', (event) => { if (event.target.id === 'tutorial-scrim') closeTutorial(); });

  $('#secure-seal').addEventListener('click', async () => {
    if (!globalThis.crypto?.subtle) { toast('Secure packets need a modern browser on localhost or HTTPS.'); return; }
    try {
      packet = await sealPacket($('#secure-message').value.trim());
      $('#secure-packet').hidden = false;
      $('#secure-packet').innerHTML = `<div><span>RANDOM IV</span><code>${packet.ivHex}</code></div><div><span>CIPHERTEXT</span><code>${packet.ciphertextBase64}</code></div><div><span>AUTH TAG</span><code>${packet.tagHex}</code></div>`;
      $('#secure-open').disabled = false;
      $('#secure-tamper').disabled = false;
      $('#secure-result').textContent = 'Packet sealed. The authentication tag protects message integrity.';
      toast('AES-GCM packet sealed locally.');
    } catch (error) {
      console.error(error);
      $('#secure-result').textContent = 'Could not seal this packet in the current browser.';
    }
  });
  $('#secure-open').addEventListener('click', async () => {
    if (!packet) return;
    try { $('#secure-result').textContent = `AUTHENTICATED · ${await openPacket(packet)}`; }
    catch { $('#secure-result').textContent = 'AUTHENTICATION FAILED · message not released'; }
  });
  $('#secure-tamper').addEventListener('click', async () => {
    if (!packet) return;
    const rejected = await verifyTamperRejection(packet);
    $('#secure-result').textContent = rejected ? 'TAMPER REJECTED · modified ciphertext failed authentication.' : 'Integrity check did not reject the modified packet.';
    if (rejected && localStorage.getItem('space-cypher-tamper-cleared') !== 'yes') {
      localStorage.setItem('space-cypher-tamper-cleared', 'yes');
      addXP(25);
      toast('Tampering detected. +25 XP');
    }
  });

  renderTierTabs();
  loadTier(1);
  if (!tutorialWasSeen()) showTutorial();
  return { showTutorial };
}
