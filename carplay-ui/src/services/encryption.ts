import CryptoJS from 'crypto-js';

// Must match the 32-byte key used in Flutter mobile app
const SHARED_KEY_STRING = 'driveos_hackathon_e2e_secret_key';
const KEY = CryptoJS.enc.Utf8.parse(SHARED_KEY_STRING);

export class EncryptionService {
  /**
   * Encrypts a JSON object and returns a Base64 string: Base64(IV + Ciphertext)
   */
  static encryptPayload(data: any): string {
    try {
      const jsonString = JSON.stringify(data);
      
      // Generate 16 random bytes for IV
      const iv = CryptoJS.lib.WordArray.random(16);
      
      // Encrypt
      const encrypted = CryptoJS.AES.encrypt(jsonString, KEY, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      
      // Combine IV + Ciphertext (WordArray concat)
      // encrypted.ciphertext is the actual encrypted data
      const combined = iv.clone().concat(encrypted.ciphertext);
      
      // Return as Base64
      return CryptoJS.enc.Base64.stringify(combined);
    } catch (e) {
      console.error('Encryption Error:', e);
      return '';
    }
  }

  /**
   * Decrypts a Base64 string: Base64(IV + Ciphertext) -> JSON Object
   */
  static decryptPayload(encryptedBase64: string): any {
    try {
      // Decode Base64
      const combined = CryptoJS.enc.Base64.parse(encryptedBase64);
      
      // Extract the 16-byte IV (in WordArray, 1 word = 4 bytes, so length = 4 words)
      const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
      
      // Extract Ciphertext
      const ciphertext = CryptoJS.lib.WordArray.create(
        combined.words.slice(4),
        combined.sigBytes - 16
      );
      
      // Create CipherParams
      const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: ciphertext });
      
      // Decrypt
      const decryptedData = CryptoJS.AES.decrypt(cipherParams, KEY, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      
      const decryptedString = decryptedData.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) return null;
      
      return JSON.parse(decryptedString);
    } catch (e) {
      console.error('Decryption Error:', e);
      return null;
    }
  }
}
