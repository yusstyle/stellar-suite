/**
 * sshKeyManager.ts
 *
 * In-browser SSH key generation, storage, and management using the WebCrypto
 * API (ECDSA P-256 / ecdsa-sha2-nistp256). Private key material is exported as
 * JWK and persisted in IndexedDB (origin-scoped secure storage). Public keys
 * are formatted in the standard OpenSSH wire format so they can be pasted
 * directly into GitHub → Settings → SSH Keys.
 *
 * ⚠️  SECURITY NOTICE
 * Private keys are stored as plain JWK in IndexedDB. This is protected by
 * the browser's same-origin policy but is NOT encrypted with a passphrase.
 * Never export or share the private key material.
 */

import { get, set, del } from "idb-keyval";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SSHKeyPair {
  /** Stable UUID-like identifier generated at creation time. */
  id: string;
  /** Human-readable label chosen by the user. */
  name: string;
  /** Full OpenSSH-format public key (ready to paste into GitHub). */
  publicKey: string;
  /** SSH key algorithm identifier. */
  algorithm: "ecdsa-sha2-nistp256";
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /**
   * SSH fingerprint in the format `SHA256:<base64>` — matches what
   * `ssh-keygen -l` produces and what GitHub displays.
   */
  fingerprint: string;
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const META_STORE_KEY = "ssh_keys_metadata";
const privateKeyStoreKey = (id: string) => `ssh_key_private_${id}`;

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

/** Write a 32-bit big-endian unsigned integer into a Uint8Array. */
function uint32BE(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

/** Length-prefix a UTF-8 string as an SSH wire-format string field. */
function sshString(value: string): Uint8Array {
  const encoded = new TextEncoder().encode(value);
  const out = new Uint8Array(4 + encoded.length);
  out.set(uint32BE(encoded.length), 0);
  out.set(encoded, 4);
  return out;
}

/** Length-prefix an arbitrary byte array as an SSH wire-format byte field. */
function sshBytes(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + bytes.length);
  out.set(uint32BE(bytes.length), 0);
  out.set(bytes, 4);
  return out;
}

/** Concatenate multiple Uint8Arrays. */
function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Encode binary data as Base64 without relying on spread (avoids stack overflow on large buffers). */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Build the SSH wire-format blob for an ecdsa-sha2-nistp256 public key.
 * The blob is three length-prefixed fields:
 *   [key-type "ecdsa-sha2-nistp256"][curve "nistp256"][Q-point uncompressed]
 */
async function buildPublicKeyBlob(publicCryptoKey: CryptoKey): Promise<Uint8Array> {
  // WebCrypto exports EC public keys in uncompressed form (0x04 || X || Y).
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", publicCryptoKey));
  return concat(sshString("ecdsa-sha2-nistp256"), sshString("nistp256"), sshBytes(raw));
}

/**
 * Encode a CryptoKey (ECDSA P-256 public) into the standard OpenSSH public key
 * line: `ecdsa-sha2-nistp256 <base64> <comment>`.
 */
async function encodeOpenSSHPublicKey(publicCryptoKey: CryptoKey, comment: string): Promise<string> {
  const blob = await buildPublicKeyBlob(publicCryptoKey);
  return `ecdsa-sha2-nistp256 ${toBase64(blob)}${comment ? ` ${comment}` : ""}`;
}

/**
 * Compute the SSH fingerprint for a public key.
 * Format: `SHA256:<unpadded-base64-of-sha256-digest>` — identical to what
 * `ssh-keygen -l -E sha256` reports and GitHub displays.
 */
async function computeFingerprint(publicCryptoKey: CryptoKey): Promise<string> {
  const blob = await buildPublicKeyBlob(publicCryptoKey);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", blob));
  return `SHA256:${toBase64(digest).replace(/=+$/, "")}`;
}

/** Generate a collision-resistant identifier (hex string). */
function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Metadata helpers
// ---------------------------------------------------------------------------

async function loadMetadata(): Promise<SSHKeyPair[]> {
  const stored = await get<SSHKeyPair[]>(META_STORE_KEY);
  return stored ?? [];
}

async function saveMetadata(pairs: SSHKeyPair[]): Promise<void> {
  await set(META_STORE_KEY, pairs);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a new ECDSA P-256 SSH key pair.
 *
 * The private key is persisted as a JWK in IndexedDB under origin-scoped
 * storage. The returned {@link SSHKeyPair} contains the public key ready to
 * paste into GitHub (or any OpenSSH-compatible service).
 *
 * @param name    Human-readable label for this key pair.
 * @param comment Optional comment appended to the public key line (defaults to `name`).
 */
export async function generateSSHKeyPair(name: string, comment?: string): Promise<SSHKeyPair> {
  if (!name.trim()) {
    throw new Error("Key name must not be empty.");
  }

  // Generate the key pair using WebCrypto ECDSA P-256.
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true, // extractable — required so we can export and store the private key
    ["sign", "verify"],
  );

  const id = generateId();
  const keyComment = comment?.trim() || name.trim();

  const [publicKey, fingerprint] = await Promise.all([
    encodeOpenSSHPublicKey(keyPair.publicKey, keyComment),
    computeFingerprint(keyPair.publicKey),
  ]);

  // Export the private key as JWK for persistent storage.
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  await set(privateKeyStoreKey(id), privateJwk);

  const meta: SSHKeyPair = {
    id,
    name: name.trim(),
    publicKey,
    algorithm: "ecdsa-sha2-nistp256",
    createdAt: new Date().toISOString(),
    fingerprint,
  };

  const existing = await loadMetadata();
  await saveMetadata([...existing, meta]);

  return meta;
}

/**
 * Return all stored SSH key pairs (metadata only — private keys are never
 * returned from this function).
 */
export async function listSSHKeyPairs(): Promise<SSHKeyPair[]> {
  return loadMetadata();
}

/**
 * Delete an SSH key pair by ID.
 * Both the metadata entry and the stored private key material are removed.
 */
export async function deleteSSHKeyPair(id: string): Promise<void> {
  const pairs = await loadMetadata();
  const filtered = pairs.filter((p) => p.id !== id);
  await Promise.all([saveMetadata(filtered), del(privateKeyStoreKey(id))]);
}

/**
 * Retrieve the private key JWK for a given key pair ID.
 *
 * ⚠️  Handle with care — this returns sensitive key material.
 * It is provided for future SSH transport integration; do not log or expose
 * the returned value.
 */
export async function getPrivateKeyJwk(id: string): Promise<JsonWebKey | null> {
  return get<JsonWebKey>(privateKeyStoreKey(id)) ?? null;
}

/**
 * Re-import a stored private key as a non-extractable CryptoKey suitable for
 * use with `crypto.subtle.sign`.
 */
export async function importPrivateKey(id: string): Promise<CryptoKey | null> {
  const jwk = await getPrivateKeyJwk(id);
  if (!jwk) return null;

  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false, // non-extractable once re-imported
    ["sign"],
  );
}
