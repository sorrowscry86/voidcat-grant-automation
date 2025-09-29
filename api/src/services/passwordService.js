// Password Service for VoidCat Grant Automation Platform - Tier 4.2
// Provides secure password hashing and validation using modern crypto standards
// Using Web Crypto API for Cloudflare Workers compatibility
/**
 * Password Service for secure password handling
 * Uses PBKDF2 with SHA-256 for password hashing
 */
export class PasswordService {
  constructor(env) {
    this.env = env;
    this.iterations = parseInt(env.PASSWORD_HASH_ITERATIONS || '100000');
    this.keyLength = 32; // 256 bits
    this.saltLength = 16; // 128 bits
  }

  /**
   * Hash a password with a random salt
   */
  async hashPassword(password) {
    try {
      // Validate password strength
      this.validatePasswordStrength(password);

      // Generate random salt
      const salt = crypto.getRandomValues(new Uint8Array(this.saltLength));

      // Hash password
      const hash = await this.deriveKey(password, salt);

      // Combine salt and hash for storage
      const combined = new Uint8Array(this.saltLength + this.keyLength);
      combined.set(salt, 0);
      combined.set(hash, this.saltLength);

      // Return base64 encoded result
      return this.arrayBufferToBase64(combined.buffer);
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error(`Failed to hash password: ${error.message}`);
    }
  }

  /**
   * Verify a password against its hash
   */
  async verifyPassword(password, hashedPassword) {
    try {
      // Decode the stored hash
      const combined = new Uint8Array(this.base64ToArrayBuffer(hashedPassword));
      
      if (combined.length !== this.saltLength + this.keyLength) {
        throw new Error('Invalid hash format');
      }

      // Extract salt and hash
      const salt = combined.slice(0, this.saltLength);
      const storedHash = combined.slice(this.saltLength);

      // Hash the provided password with the same salt
      const computedHash = await this.deriveKey(password, salt);

      // Compare hashes using constant-time comparison
      return this.constantTimeEquals(storedHash, computedHash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Derive key using PBKDF2
   */
  async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive key using PBKDF2
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: this.keyLength * 8
      },
      true,
      ['encrypt']
    );

    // Export key as raw bytes
    const keyBuffer = await crypto.subtle.exportKey('raw', key);
    return new Uint8Array(keyBuffer);
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    const minLength = parseInt(this.env.PASSWORD_MIN_LENGTH || '8');
    const maxLength = parseInt(this.env.PASSWORD_MAX_LENGTH || '128');

    if (password.length < minLength) {
      throw new Error(`Password must be at least ${minLength} characters long`);
    }

    if (password.length > maxLength) {
      throw new Error(`Password must be no more than ${maxLength} characters long`);
    }

    // Check for basic complexity requirements
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    const complexityScore = [hasLowercase, hasUppercase, hasNumbers, hasSpecialChars]
      .filter(Boolean).length;

    if (complexityScore < 3) {
      throw new Error('Password must contain at least 3 of: lowercase, uppercase, numbers, special characters');
    }

    // Check for common weak passwords
    const commonWeakPasswords = [
      'password', 'password123', '123456', '123456789', 'qwerty',
      'abc123', 'admin', 'letmein', 'welcome', 'monkey'
    ];

    if (commonWeakPasswords.includes(password.toLowerCase())) {
      throw new Error('Password is too common and easily guessable');
    }
  }

  /**
   * Generate a secure random password
   */

  // Helper to get unbiased random int for a given max (exclusive)
  getSecureRandomInt(max) {
    if (max < 1 || max > 256) throw new Error('Invalid max for random int');
    // rejection sampling
    let rand;
    const limit = Math.floor(256 / max) * max;
    do {
      rand = crypto.getRandomValues(new Uint8Array(1))[0];
    } while (rand >= limit);
    return rand % max;
  }

  generateSecurePassword(length = 16) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + specialChars;
    
    // Ensure at least one character from each category using unbiased random
    let passwordChars = [];
    passwordChars.push(lowercase[this.getSecureRandomInt(lowercase.length)]);
    passwordChars.push(uppercase[this.getSecureRandomInt(uppercase.length)]);
    passwordChars.push(numbers[this.getSecureRandomInt(numbers.length)]);
    passwordChars.push(specialChars[this.getSecureRandomInt(specialChars.length)]);
    
    // Fill the rest randomly (unbiased)
    for (let i = 4; i < length; i++) {
      passwordChars.push(allChars[this.getSecureRandomInt(allChars.length)]);
    }
    
    // Shuffle the password using a cryptographically secure Fisher-Yates shuffle (unbiased)
    for (let i = passwordChars.length - 1; i > 0; i--) {
      const j = this.getSecureRandomInt(i + 1);
      [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
    }
    return passwordChars.join('');
  }

  /**
   * Constant-time comparison to prevent timing attacks
   */
  constantTimeEquals(a, b) {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }

    return result === 0;
  }

  /**
   * Convert ArrayBuffer to base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      result += String.fromCharCode(bytes[i]);
    }
    return btoa(result);
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  }

  /**
   * Create a secure password reset token
   * SECURITY FIX: Use cryptographically secure random token instead of predictable JSON encoding
   */
  async generatePasswordResetToken(email) {
    // Generate a cryptographically secure random token
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32)); // 256 bits
    const token = this.arrayBufferToBase64(tokenBytes.buffer)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Store token hash and metadata separately (would be stored in database)
    const tokenHash = await this.hashToken(token);
    const tokenData = {
      email: email,
      timestamp: Date.now(),
      token_hash: tokenHash
    };

    // Return both the token (to send to user) and data (to store in database)
    return {
      token: token,
      data: tokenData
    };
  }

  /**
   * Hash a token for secure storage
   */
  async hashToken(token) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToBase64(hashBuffer);
  }

  /**
   * Verify a password reset token against stored hash
   * SECURITY FIX: Verify against stored hash instead of decoding token data
   */
  async verifyPasswordResetToken(token, storedTokenData, maxAgeMinutes = 60) {
    try {
      // Hash the provided token
      const tokenHash = await this.hashToken(token);

      // Verify token hash matches (constant-time comparison)
      if (!this.constantTimeStringEquals(tokenHash, storedTokenData.token_hash)) {
        return false;
      }

      // Verify token age
      const tokenAge = Date.now() - storedTokenData.timestamp;
      const maxAge = maxAgeMinutes * 60 * 1000;

      if (tokenAge > maxAge) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Password reset token verification error:', error);
      return false;
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  constantTimeStringEquals(a, b) {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Check if password needs to be rehashed (due to changed parameters)
   */
  needsRehash(hashedPassword) {
    try {
      // In a more sophisticated implementation, you might store
      // the hashing parameters with the hash and check if they match current settings
      return false; // For now, assume no rehashing needed
    } catch (error) {
      return true; // If we can't verify, assume rehash is needed
    }
  }
}

export default PasswordService;