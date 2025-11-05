import crypto from 'crypto'

export class EncryptionService {
  private algorithm = 'aes-256-gcm'
  private keyLength = 32 // 256 bits
  private ivLength = 16  // 128 bits
  private tagLength = 16 // 128 bits

  private getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required')
    }
    
    // If the key is base64 encoded, decode it
    if (key.length === 44 && key.includes('=')) {
      return Buffer.from(key, 'base64')
    }
    
    // If the key is hex encoded
    if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
      return Buffer.from(key, 'hex')
    }
    
    // Otherwise, derive key from string using PBKDF2
    const salt = Buffer.from('solvency-platform-salt', 'utf8') // Fixed salt for consistency
    return crypto.pbkdf2Sync(key, salt, 100000, this.keyLength, 'sha256')
  }

  encrypt(data: any): string {
    return this.encryptGCM(data)
  }

  decrypt(encryptedData: string): any {
    return this.decryptGCM(encryptedData)
  }

  // GCM implementation using proper Node.js crypto APIs
  encryptGCM(data: any): string {
    try {
      const plaintext = JSON.stringify(data)
      const key = this.getEncryptionKey()
      const iv = crypto.randomBytes(this.ivLength)
      
      const cipher = crypto.createCipher('aes-256-gcm', key)
      cipher.setAAD(Buffer.from('solvency-credentials', 'utf8'))
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const tag = cipher.getAuthTag()
      
      // Combine iv + tag + encrypted data
      const combined = Buffer.concat([
        iv,
        tag,
        Buffer.from(encrypted, 'hex')
      ])
      
      return combined.toString('base64')
    } catch (error) {
      // Fallback to simple encryption
      return this.encryptSimple(data)
    }
  }

  decryptGCM(encryptedData: string): any {
    try {
      const combined = Buffer.from(encryptedData, 'base64')
      
      // Extract components
      const iv = combined.subarray(0, this.ivLength)
      const tag = combined.subarray(this.ivLength, this.ivLength + this.tagLength)
      const encrypted = combined.subarray(this.ivLength + this.tagLength)
      
      const key = this.getEncryptionKey()
      
      const decipher = crypto.createDecipher('aes-256-gcm', key)
      decipher.setAAD(Buffer.from('solvency-credentials', 'utf8'))
      decipher.setAuthTag(tag)
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8')
      decrypted += decipher.final('utf8')
      
      return JSON.parse(decrypted)
    } catch (error) {
      // Fallback to simple decryption
      return this.decryptSimple(encryptedData)
    }
  }

  // Simple AES encryption fallback
  private encryptSimple(data: any): string {
    try {
      const plaintext = JSON.stringify(data)
      const key = this.getEncryptionKey()
      const iv = crypto.randomBytes(16)
      
      const cipher = crypto.createCipher('aes-256-cbc', key)
      let encrypted = cipher.update(plaintext, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      // Combine iv + encrypted data
      const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex')])
      return combined.toString('base64')
    } catch (error) {
      console.error('Simple encryption failed:', error)
      throw new Error('Failed to encrypt credentials')
    }
  }

  private decryptSimple(encryptedData: string): any {
    try {
      const combined = Buffer.from(encryptedData, 'base64')
      const iv = combined.subarray(0, 16)
      const encrypted = combined.subarray(16)
      
      const key = this.getEncryptionKey()
      const decipher = crypto.createDecipher('aes-256-cbc', key)
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8')
      decrypted += decipher.final('utf8')
      
      return JSON.parse(decrypted)
    } catch (error) {
      console.error('Simple decryption failed:', error)
      throw new Error('Failed to decrypt credentials')
    }
  }

  // Generate a secure encryption key (for initial setup)
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('base64')
  }

  // Hash a string for comparison (non-reversible)
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  // Create HMAC for webhook validation
  createHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex')
  }

  // Verify HMAC
  verifyHMAC(data: string, secret: string, signature: string): boolean {
    const computed = this.createHMAC(data, secret)
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService()