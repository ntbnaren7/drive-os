import 'dart:convert';
import 'package:encrypt/encrypt.dart';
import 'package:flutter/foundation.dart' hide Key;

class EncryptionService {
  // Use a 32-byte key for AES-256
  static const String _sharedKeyString = 'driveos_hackathon_e2e_secret_key';
  static final Key _key = Key.fromUtf8(_sharedKeyString);
  
  static final Encrypter _encrypter = Encrypter(AES(_key, mode: AESMode.cbc, padding: 'PKCS7'));

  /// Encrypts a JSON payload (map) and returns a Base64 string containing [IV (16 bytes) | ciphertext]
  static String encryptPayload(Map<String, dynamic> data) {
    try {
      final jsonString = jsonEncode(data);
      final iv = IV.fromSecureRandom(16);
      final encrypted = _encrypter.encrypt(jsonString, iv: iv);
      
      // Prepend the raw IV bytes to the encrypted bytes
      final combinedBytes = iv.bytes + encrypted.bytes;
      return base64Encode(combinedBytes);
    } catch (e) {
      if (kDebugMode) print('Encryption Error: $e');
      return '';
    }
  }

  /// Decrypts a Base64 string containing [IV (16 bytes) | ciphertext] back into a JSON map
  static Map<String, dynamic>? decryptPayload(String encryptedBase64) {
    try {
      final combinedBytes = base64Decode(encryptedBase64);
      
      if (combinedBytes.length < 16) return null;
      
      // Extract the 16-byte IV
      final ivBytes = combinedBytes.sublist(0, 16);
      final iv = IV(Uint8List.fromList(ivBytes));
      
      // Extract the ciphertext
      final cipherBytes = combinedBytes.sublist(16);
      final encrypted = Encrypted(Uint8List.fromList(cipherBytes));
      
      final decryptedString = _encrypter.decrypt(encrypted, iv: iv);
      return jsonDecode(decryptedString) as Map<String, dynamic>;
    } catch (e) {
      if (kDebugMode) print('Decryption Error: $e');
      return null;
    }
  }
}
