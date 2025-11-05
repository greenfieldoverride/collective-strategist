import { EncryptionService } from '../../services/encryption-service'

describe('EncryptionService', () => {
  let encryptionService: EncryptionService
  const originalEnv = process.env.ENCRYPTION_KEY

  beforeEach(() => {
    // Set a test encryption key
    process.env.ENCRYPTION_KEY = 'dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcw=='
    encryptionService = new EncryptionService()
  })

  afterEach(() => {
    // Restore original environment
    process.env.ENCRYPTION_KEY = originalEnv
  })

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt simple objects', () => {
      const testData = {
        apiKey: 'test-api-key',
        secretKey: 'test-secret-key',
        environment: 'sandbox'
      }

      const encrypted = encryptionService.encryptGCM(testData)
      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toContain('test-api-key')

      const decrypted = encryptionService.decryptGCM(encrypted)
      expect(decrypted).toEqual(testData)
    })

    it('should encrypt and decrypt complex nested objects', () => {
      const testData = {
        credentials: {
          stripe: {
            secretKey: 'sk_test_123456789',
            publishableKey: 'pk_test_123456789'
          },
          paypal: {
            clientId: 'paypal_client_id',
            clientSecret: 'paypal_client_secret',
            environment: 'sandbox'
          }
        },
        settings: {
          webhooksEnabled: true,
          syncFrequency: 'daily',
          metadata: {
            userId: 'user_123',
            ventureId: 'venture_456'
          }
        }
      }

      const encrypted = encryptionService.encryptGCM(testData)
      const decrypted = encryptionService.decryptGCM(encrypted)
      
      expect(decrypted).toEqual(testData)
    })

    it('should handle empty objects', () => {
      const testData = {}
      
      const encrypted = encryptionService.encryptGCM(testData)
      const decrypted = encryptionService.decryptGCM(encrypted)
      
      expect(decrypted).toEqual(testData)
    })

    it('should handle null and undefined values', () => {
      const testData = {
        apiKey: 'test-key',
        optionalField: null,
        undefinedField: undefined,
        emptyString: '',
        zeroValue: 0,
        falseValue: false
      }

      const encrypted = encryptionService.encryptGCM(testData)
      const decrypted = encryptionService.decryptGCM(encrypted)
      
      expect(decrypted).toEqual(testData)
    })

    it('should produce different ciphertext for same plaintext', () => {
      const testData = { apiKey: 'same-data' }
      
      const encrypted1 = encryptionService.encryptGCM(testData)
      const encrypted2 = encryptionService.encryptGCM(testData)
      
      expect(encrypted1).not.toEqual(encrypted2)
      
      const decrypted1 = encryptionService.decryptGCM(encrypted1)
      const decrypted2 = encryptionService.decryptGCM(encrypted2)
      
      expect(decrypted1).toEqual(testData)
      expect(decrypted2).toEqual(testData)
    })
  })

  describe('error handling', () => {
    it('should throw error when decrypting invalid data', () => {
      expect(() => {
        encryptionService.decryptGCM('invalid-encrypted-data')
      }).toThrow('Failed to decrypt credentials')
    })

    it('should throw error when decrypting empty string', () => {
      expect(() => {
        encryptionService.decryptGCM('')
      }).toThrow('Failed to decrypt credentials')
    })

    it('should throw error when decrypting corrupted data', () => {
      const testData = { apiKey: 'test' }
      const encrypted = encryptionService.encryptGCM(testData)
      
      // Corrupt the encrypted data
      const corrupted = encrypted.slice(0, -5) + 'xxxxx'
      
      expect(() => {
        encryptionService.decryptGCM(corrupted)
      }).toThrow('Failed to decrypt credentials')
    })

    it('should throw error when ENCRYPTION_KEY is missing', () => {
      delete process.env.ENCRYPTION_KEY
      
      expect(() => {
        new EncryptionService().encryptGCM({ test: 'data' })
      }).toThrow('ENCRYPTION_KEY environment variable is required')
    })
  })

  describe('HMAC operations', () => {
    it('should create and verify HMAC signatures', () => {
      const data = 'test-webhook-payload'
      const secret = 'webhook-secret-key'
      
      const hmac = encryptionService.createHMAC(data, secret)
      expect(hmac).toBeDefined()
      expect(typeof hmac).toBe('string')
      expect(hmac.length).toBe(64) // SHA256 hex length
      
      const isValid = encryptionService.verifyHMAC(data, secret, hmac)
      expect(isValid).toBe(true)
    })

    it('should reject invalid HMAC signatures', () => {
      const data = 'test-webhook-payload'
      const secret = 'webhook-secret-key'
      const invalidHmac = 'invalid-hmac-signature'
      
      const isValid = encryptionService.verifyHMAC(data, secret, invalidHmac)
      expect(isValid).toBe(false)
    })

    it('should reject HMAC with wrong secret', () => {
      const data = 'test-webhook-payload'
      const secret = 'webhook-secret-key'
      const wrongSecret = 'wrong-secret-key'
      
      const hmac = encryptionService.createHMAC(data, secret)
      const isValid = encryptionService.verifyHMAC(data, wrongSecret, hmac)
      expect(isValid).toBe(false)
    })

    it('should reject HMAC with modified data', () => {
      const data = 'test-webhook-payload'
      const modifiedData = 'modified-webhook-payload'
      const secret = 'webhook-secret-key'
      
      const hmac = encryptionService.createHMAC(data, secret)
      const isValid = encryptionService.verifyHMAC(modifiedData, secret, hmac)
      expect(isValid).toBe(false)
    })
  })

  describe('hash operations', () => {
    it('should create consistent hashes', () => {
      const data = 'test-data-to-hash'
      
      const hash1 = encryptionService.hash(data)
      const hash2 = encryptionService.hash(data)
      
      expect(hash1).toEqual(hash2)
      expect(hash1.length).toBe(64) // SHA256 hex length
    })

    it('should create different hashes for different data', () => {
      const data1 = 'test-data-1'
      const data2 = 'test-data-2'
      
      const hash1 = encryptionService.hash(data1)
      const hash2 = encryptionService.hash(data2)
      
      expect(hash1).not.toEqual(hash2)
    })
  })

  describe('key generation', () => {
    it('should generate valid encryption keys', () => {
      const key = EncryptionService.generateEncryptionKey()
      
      expect(key).toBeDefined()
      expect(typeof key).toBe('string')
      expect(key.length).toBe(44) // Base64 encoded 32 bytes
      
      // Should be valid base64
      expect(() => Buffer.from(key, 'base64')).not.toThrow()
      
      // Should be 32 bytes when decoded
      const decoded = Buffer.from(key, 'base64')
      expect(decoded.length).toBe(32)
    })

    it('should generate unique keys', () => {
      const key1 = EncryptionService.generateEncryptionKey()
      const key2 = EncryptionService.generateEncryptionKey()
      
      expect(key1).not.toEqual(key2)
    })
  })

  describe('legacy encrypt/decrypt methods', () => {
    it('should work with legacy encrypt/decrypt methods', () => {
      const testData = {
        apiKey: 'legacy-test-key',
        secretKey: 'legacy-secret-key'
      }

      const encrypted = encryptionService.encrypt(testData)
      const decrypted = encryptionService.decrypt(encrypted)
      
      expect(decrypted).toEqual(testData)
    })
  })

  describe('integration with real-world data', () => {
    it('should handle typical Stripe credentials', () => {
      const stripeCredentials = {
        secretKey: 'sk_test_51ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890',
        publishableKey: 'pk_test_51ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890',
        environment: 'sandbox' as const,
        webhookSecret: 'whsec_1234567890abcdefghijklmnopqrstuvwxyz'
      }

      const encrypted = encryptionService.encryptGCM(stripeCredentials)
      const decrypted = encryptionService.decryptGCM(encrypted)
      
      expect(decrypted).toEqual(stripeCredentials)
    })

    it('should handle typical PayPal credentials', () => {
      const paypalCredentials = {
        apiKey: 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz1234567890',
        secretKey: 'EE1234567890AbCdEfGhIjKlMnOpQrStUvWxYz-1234567890AbCdEfGhIjKlMnOp',
        environment: 'production' as const
      }

      const encrypted = encryptionService.encryptGCM(paypalCredentials)
      const decrypted = encryptionService.decryptGCM(encrypted)
      
      expect(decrypted).toEqual(paypalCredentials)
    })

    it('should handle large credential objects', () => {
      const largeCredentials = {
        platform: 'complex-platform',
        credentials: {
          apiKey: 'a'.repeat(1000),
          secretKey: 'b'.repeat(1000),
          additionalTokens: Array.from({ length: 100 }, (_, i) => `token-${i}-${'x'.repeat(50)}`)
        },
        settings: {
          webhooks: {
            enabled: true,
            endpoints: Array.from({ length: 50 }, (_, i) => `https://example.com/webhook-${i}`)
          },
          metadata: {
            description: 'c'.repeat(2000),
            tags: Array.from({ length: 200 }, (_, i) => `tag-${i}`)
          }
        }
      }

      const encrypted = encryptionService.encryptGCM(largeCredentials)
      const decrypted = encryptionService.decryptGCM(encrypted)
      
      expect(decrypted).toEqual(largeCredentials)
    })
  })
})