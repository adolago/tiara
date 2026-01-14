## 2026-01-14 - Broken AES-GCM Encryption
**Vulnerability:** The `CryptographicCore` used `crypto.createCipher` (deprecated) with AES-256-GCM. This function ignores the generated IV and uses a weak KDF (MD5), leading to IV reuse and potential key exposure.
**Learning:** Even "unused" or "prototype" security code in a codebase poses a risk as it might be adopted blindly. Deprecated crypto functions in Node.js can fail silently or behave insecurely (e.g. ignoring arguments) before being removed.
**Prevention:** Always use `createCipheriv` with explicit Key and IV management. Use proper KDFs (PBKDF2/scrypt/Argon2) for password-based encryption. Lint for deprecated crypto functions.
