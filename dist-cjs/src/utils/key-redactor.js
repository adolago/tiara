export class KeyRedactor {
    static API_KEY_PATTERNS = [
        /sk-ant-[a-zA-Z0-9_-]{95,}/gi,
        /sk-or-[a-zA-Z0-9_-]{32,}/gi,
        /AIza[a-zA-Z0-9_-]{35}/gi,
        /[a-zA-Z0-9_-]{20,}API[a-zA-Z0-9_-]{20,}/gi,
        /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi,
        /([A-Z_]+_API_KEY|[A-Z_]+_TOKEN|[A-Z_]+_SECRET)=["']?([^"'\s]+)["']?/gi,
        /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/gi
    ];
    static COMBINED_PATTERN = new RegExp(KeyRedactor.API_KEY_PATTERNS.map((p)=>p.source).join('|'), 'gi');
    static SENSITIVE_FIELDS = [
        'apiKey',
        'api_key',
        'token',
        'secret',
        'password',
        'private_key',
        'privateKey',
        'accessToken',
        'access_token',
        'refreshToken',
        'refresh_token'
    ];
    static SENSITIVE_KEY_PATTERN = new RegExp(KeyRedactor.SENSITIVE_FIELDS.join('|'), 'i');
    static redact(text, showPrefix = true) {
        if (!text) return text;
        return text.replace(this.COMBINED_PATTERN, (match)=>{
            if (showPrefix && match.length > 8) {
                const prefix = match.substring(0, 8);
                return `${prefix}...[REDACTED]`;
            }
            return '[REDACTED_API_KEY]';
        });
    }
    static redactObject(obj, deep = true) {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) {
            let changed = false;
            const newArray = obj.map((item)=>{
                let newItem = item;
                if (typeof item === 'string') {
                    newItem = this.redact(item);
                } else {
                    newItem = this.redactObject(item, deep);
                }
                if (newItem !== item) changed = true;
                return newItem;
            });
            return changed ? newArray : obj;
        }
        let redacted = null;
        const keys = Object.keys(obj);
        for (const key of keys){
            const val = obj[key];
            let newVal = val;
            const isSensitive = typeof val === 'string' && this.SENSITIVE_KEY_PATTERN.test(key);
            if (isSensitive) {
                if (val && val.length > 8) {
                    newVal = `${val.substring(0, 4)}...[REDACTED]`;
                } else {
                    newVal = '[REDACTED]';
                }
            } else if (deep && typeof val === 'object' && val !== null) {
                newVal = this.redactObject(val, deep);
            } else if (typeof val === 'string') {
                newVal = this.redact(val);
            }
            if (newVal !== val) {
                if (!redacted) {
                    redacted = {
                        ...obj
                    };
                }
                redacted[key] = newVal;
            }
        }
        return redacted || obj;
    }
    static sanitize(text) {
        return this.redact(text, true);
    }
    static sanitizeArgs(args) {
        return args.map((arg)=>{
            if (arg.includes('key') || arg.includes('token') || arg.includes('secret')) {
                return this.redact(arg);
            }
            return arg;
        });
    }
    static containsSensitiveData(text) {
        return text.search(this.COMBINED_PATTERN) !== -1;
    }
    static validate(text) {
        const warnings = [];
        this.API_KEY_PATTERNS.forEach((pattern, index)=>{
            pattern.lastIndex = 0;
            if (pattern.test(text)) {
                warnings.push(`Potential API key detected (pattern ${index + 1})`);
            }
        });
        return {
            safe: warnings.length === 0,
            warnings
        };
    }
    static redactEnv(env) {
        const redacted = {};
        Object.keys(env).forEach((key)=>{
            const value = env[key];
            if (!value) {
                redacted[key] = '';
                return;
            }
            const lowerKey = key.toLowerCase();
            const isSensitive = lowerKey.includes('key') || lowerKey.includes('token') || lowerKey.includes('secret') || lowerKey.includes('password');
            if (isSensitive) {
                redacted[key] = value.length > 8 ? `${value.substring(0, 4)}...[REDACTED]` : '[REDACTED]';
            } else {
                redacted[key] = value;
            }
        });
        return redacted;
    }
}
export const redactor = KeyRedactor;

//# sourceMappingURL=key-redactor.js.map