## 2026-01-14 - Broken AES-GCM Encryption
**Vulnerability:** The `CryptographicCore` used `crypto.createCipher` (deprecated) with AES-256-GCM. This function ignores the generated IV and uses a weak KDF (MD5), leading to IV reuse and potential key exposure.
**Learning:** Even "unused" or "prototype" security code in a codebase poses a risk as it might be adopted blindly. Deprecated crypto functions in Node.js can fail silently or behave insecurely (e.g. ignoring arguments) before being removed.
**Prevention:** Always use `createCipheriv` with explicit Key and IV management. Use proper KDFs (PBKDF2/scrypt/Argon2) for password-based encryption. Lint for deprecated crypto functions.

## 2026-01-14 - Middleware Ordering and Auth Bypass
**Vulnerability:** `SwarmApi` authentication was missing, and middleware setup was unordered (logging/validation added after routes). Even if auth was added, it might have been bypassed for some routes if added in wrong order.
**Learning:** In Express, middleware order is critical. Pre-route middleware (Auth, Logging) must be registered before routes. Post-route middleware (Error Handling) must be registered last.
**Prevention:** Use explicit `setupRequestMiddleware` and `setupErrorMiddleware` methods called in the correct order in the constructor. Always verify that security middleware runs before business logic.
