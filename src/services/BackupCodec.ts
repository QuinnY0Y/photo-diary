import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
  getRandomBytesAsync,
} from 'expo-crypto';

import type { BackupPayload } from './BackupService';

type BackupEnvelope = {
  magic: 'PHOTO_DIARY_BACKUP';
  version: 1;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  ciphertext: string;
};

const ITERATIONS = 120_000;
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1] ?? 0;
    const c = bytes[index + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    result += alphabet[(triple >> 18) & 63];
    result += alphabet[(triple >> 12) & 63];
    result += index + 1 < bytes.length ? alphabet[(triple >> 6) & 63] : '=';
    result += index + 2 < bytes.length ? alphabet[triple & 63] : '=';
  }
  return result;
}

function base64ToBytes(value: string): Uint8Array {
  const clean = value.replace(/\s/g, '');
  const output: number[] = [];
  for (let index = 0; index < clean.length; index += 4) {
    const a = alphabet.indexOf(clean[index] ?? '');
    const b = alphabet.indexOf(clean[index + 1] ?? '');
    const c = clean[index + 2] === '=' ? 0 : alphabet.indexOf(clean[index + 2] ?? '');
    const d = clean[index + 3] === '=' ? 0 : alphabet.indexOf(clean[index + 3] ?? '');
    const triple = (a << 18) | (b << 12) | (c << 6) | d;
    output.push((triple >> 16) & 255);
    if (clean[index + 2] !== '=') output.push((triple >> 8) & 255);
    if (clean[index + 3] !== '=') output.push(triple & 255);
  }
  return new Uint8Array(output);
}

async function derive(passphrase: string, salt: Uint8Array, iterations: number): Promise<AESEncryptionKey> {
  const keyBytes = await pbkdf2Async(sha256, utf8ToBytes(passphrase), salt, {
    c: iterations,
    dkLen: 32,
  });
  return AESEncryptionKey.import(keyBytes);
}

export async function encryptBackup(payload: BackupPayload, passphrase: string): Promise<string> {
  if (passphrase.length < 8) throw new Error('备份密码至少需要 8 个字符');
  const salt = await getRandomBytesAsync(16);
  const key = await derive(passphrase, salt, ITERATIONS);
  const plaintext = utf8ToBytes(JSON.stringify(payload));
  const sealed = await aesEncryptAsync(plaintext, key);
  const ciphertext = await sealed.combined('base64');
  const envelope: BackupEnvelope = {
    magic: 'PHOTO_DIARY_BACKUP',
    version: 1,
    kdf: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt: bytesToBase64(salt),
    ciphertext,
  };
  return JSON.stringify(envelope);
}

export async function decryptBackup(raw: string, passphrase: string): Promise<BackupPayload> {
  let envelope: BackupEnvelope;
  try {
    envelope = JSON.parse(raw) as BackupEnvelope;
  } catch {
    throw new Error('备份文件格式无效');
  }
  if (envelope.magic !== 'PHOTO_DIARY_BACKUP' || envelope.version !== 1) {
    throw new Error('不支持的备份文件或版本');
  }
  try {
    const key = await derive(passphrase, base64ToBytes(envelope.salt), envelope.iterations);
    const sealed = AESSealedData.fromCombined(envelope.ciphertext);
    const decrypted = await aesDecryptAsync(sealed, key);
    return JSON.parse(new TextDecoder().decode(decrypted)) as BackupPayload;
  } catch {
    throw new Error('备份密码错误或文件已损坏');
  }
}
