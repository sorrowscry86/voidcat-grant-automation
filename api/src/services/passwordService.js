// Password Service for VoidCat Grant Automation Platform - Tier 4.2
// Provides secure password hashing and validation using modern crypto standards

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
  generateSecurePassword(length = 16) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + specialChars;
    
    // Ensure at least one character from each category
    let password = '';
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
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
   * Create a password reset token
   */
  async generatePasswordResetToken(email) {
    const tokenData = {
      email: email,
      timestamp: Date.now(),
      random: crypto.randomUUID()
    };

    const token = btoa(JSON.stringify(tokenData))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return token;
  }

  /**
   * Verify a password reset token
   */
  async verifyPasswordResetToken(token, email, maxAgeMinutes = 60) {
    try {
      // Decode token
      const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      const padding = '===='.substring(0, (4 - base64.length % 4) % 4);
      const tokenData = JSON.parse(atob(base64 + padding));

      // Verify email matches
      if (tokenData.email !== email) {
        return false;
      }

      // Verify token age
      const tokenAge = Date.now() - tokenData.timestamp;
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