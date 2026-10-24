const toHex = (bytes) => [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
const toBase64 = (bytes) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

export async function sealPacket(message) {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(message);
  const ciphertextAndTag = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, encoded);
  const bytes = new Uint8Array(ciphertextAndTag);
  return { key, iv, ciphertextAndTag, ciphertext: bytes.slice(0, -16), tag: bytes.slice(-16), ivHex: toHex(iv), ciphertextBase64: toBase64(bytes.slice(0, -16)), tagHex: toHex(bytes.slice(-16)) };
}

export async function openPacket(packet) {
  const recovered = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: packet.iv, tagLength: 128 }, packet.key, packet.ciphertextAndTag);
  return new TextDecoder().decode(recovered);
}

export async function verifyTamperRejection(packet) {
  const changed = new Uint8Array(packet.ciphertextAndTag.slice(0));
  if (changed.length) changed[0] ^= 1;
  try {
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: packet.iv, tagLength: 128 }, packet.key, changed);
    return false;
  } catch {
    return true;
  }
}
