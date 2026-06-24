import { Platform } from 'react-native';

/**
 * Cross-platform Base64 디코딩
 * Web: atob 사용
 * Native: Buffer 또는 base64-js 사용
 */
export function base64Decode(b64: string): string {
  if (Platform.OS === 'web') {
    return atob(b64);
  }
  
  // React Native에서는 Buffer 객체 사용
  try {
    return Buffer.from(b64, 'base64').toString('utf-8');
  } catch {
    // 폴백: 수동 변환 (완전 호환성)
    return String.fromCharCode(...Buffer.from(b64, 'base64'));
  }
}

/**
 * Cross-platform Base64 인코딩
 * Web: btoa 사용
 * Native: Buffer 또는 base64-js 사용
 */
export function base64Encode(str: string): string {
  if (Platform.OS === 'web') {
    return btoa(str);
  }
  
  // React Native에서는 Buffer 객체 사용
  try {
    return Buffer.from(str, 'utf-8').toString('base64');
  } catch {
    // 폴백: 수동 변환
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    return Buffer.from(bytes).toString('base64');
  }
}

/**
 * Uint8Array를 Base64로 인코딩
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (Platform.OS === 'web') {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin);
  }
  
  return Buffer.from(bytes).toString('base64');
}

/**
 * Base64를 Uint8Array로 디코딩
 */
export function base64ToUint8Array(b64: string): Uint8Array {
  if (Platform.OS === 'web') {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }
  
  return new Uint8Array(Buffer.from(b64, 'base64'));
}
