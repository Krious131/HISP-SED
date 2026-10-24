const A = 65;

export function normalizeSignal(value) {
  return String(value).toUpperCase().replace(/[^A-Z]/g, '');
}

function mapLetters(text, shiftAt) {
  return String(text).replace(/[A-Z]/g, (char, index) => {
    const shift = ((shiftAt(char, index) % 26) + 26) % 26;
    return String.fromCharCode(A + (char.charCodeAt(0) - A + shift) % 26);
  });
}

export const caesar = (text, shift) => mapLetters(text.toUpperCase(), () => shift);

export function railFenceEncode(text, rails) {
  const input = normalizeSignal(text);
  if (rails <= 1) return input;
  const rows = Array.from({ length: rails }, () => []);
  let row = 0;
  let direction = 1;
  for (const char of input) {
    rows[row].push(char);
    if (row === 0) direction = 1;
    else if (row === rails - 1) direction = -1;
    row += direction;
  }
  return rows.map((line) => line.join('')).join('');
}

export function railFenceDecode(text, rails) {
  const input = normalizeSignal(text);
  if (rails <= 1) return input;
  const route = [];
  let row = 0;
  let direction = 1;
  for (let i = 0; i < input.length; i++) {
    route.push(row);
    if (row === 0) direction = 1;
    else if (row === rails - 1) direction = -1;
    row += direction;
  }
  const counts = Array(rails).fill(0);
  route.forEach((rail) => counts[rail]++);
  const bands = [];
  let offset = 0;
  for (const count of counts) {
    bands.push(input.slice(offset, offset + count).split(''));
    offset += count;
  }
  const cursors = Array(rails).fill(0);
  return route.map((rail) => bands[rail][cursors[rail]++]).join('');
}

export function railFenceRows(text, rails) {
  const input = normalizeSignal(text);
  const rows = Array.from({ length: rails }, () => []);
  let row = 0;
  let direction = 1;
  for (const char of input) {
    rows[row].push(char);
    if (row === 0) direction = 1;
    else if (row === rails - 1) direction = -1;
    row += direction;
  }
  return rows.map((line) => line.join(''));
}

export function vigenere(text, key, direction = 1) {
  const shifts = normalizeSignal(key).split('').map((char) => char.charCodeAt(0) - A);
  if (!shifts.length) return String(text).toUpperCase();
  let letterIndex = 0;
  return mapLetters(text.toUpperCase(), () => direction * shifts[letterIndex++ % shifts.length]);
}

export function buildCipherChallenge(level) {
  if (level === 1) {
    const plaintext = 'SOLAR ARRAY ONLINE';
    const key = 4;
    return { level, name: 'ROTATION WHEEL', type: 'caesar', plaintext, key, ciphertext: caesar(plaintext, key) };
  }
  if (level === 2) {
    const plaintext = 'ORBITAL BEACON CLEAR';
    const key = 3;
    return { level, name: 'RAIL FENCE', type: 'transposition', plaintext, key, ciphertext: railFenceEncode(plaintext, key) };
  }
  const plaintext = 'GROUND LINK ACTIVE';
  const key = 'LUNA';
  const offset = 2;
  return { level: 3, name: 'DUAL KEY CASCADE', type: 'layered', plaintext, key, offset, ciphertext: caesar(vigenere(plaintext, key), offset) };
}

export function decodeChallenge(challenge, enteredKey, secondKey = '') {
  if (challenge.type === 'caesar') return caesar(challenge.ciphertext, -Number(enteredKey));
  if (challenge.type === 'transposition') return railFenceDecode(challenge.ciphertext, Number(enteredKey));
  return vigenere(caesar(challenge.ciphertext, -Number(secondKey)), enteredKey, -1);
}
