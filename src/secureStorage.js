const Store = require('electron-store');
const crypto = require('crypto');
const os = require('os');

/**
 * SecureStorage class handles encrypted storage of sensitive data
 * Uses electron-store with encryption for local data
 * Session cookies are managed by Electron's persistent partition
 */
class SecureStorage {
  constructor() {
    // Generate a machine-specific encryption key
    // This ties the encryption to this specific machine
    this.encryptionKey = this.generateMachineKey();
    
    this.store = new Store({
      name: 'youtube-studio-secure',
      encryptionKey: this.encryptionKey,
      // Clear storage if encryption key changes (e.g., moved to different machine)
      clearInvalidConfig: true,
      // Schema for validation
      schema: {
        windowBounds: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            width: { type: 'number' },
            height: { type: 'number' }
          }
        },
        preferences: {
          type: 'object',
          default: {}
        },
        lastAccess: {
          type: 'number'
        }
      }
    });

    // Update last access time
    this.store.set('lastAccess', Date.now());
  }

  /**
   * Generate a machine-specific encryption key
   * Combines various system identifiers to create a unique key
   */
  generateMachineKey() {
    const machineId = [
      os.hostname(),
      os.platform(),
      os.arch(),
      os.cpus()[0]?.model || 'unknown',
      os.homedir()
    ].join('|');

    // Create a 32-byte key from machine identifiers
    return crypto
      .createHash('sha256')
      .update(machineId)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Get saved window bounds
   */
  getWindowBounds() {
    return this.store.get('windowBounds', {
      width: 1400,
      height: 900
    });
  }

  /**
   * Save window bounds
   */
  setWindowBounds(bounds) {
    this.store.set('windowBounds', bounds);
  }

  /**
   * Get user preferences
   */
  getPreferences() {
    return this.store.get('preferences', {});
  }

  /**
   * Set user preferences
   */
  setPreferences(preferences) {
    this.store.set('preferences', preferences);
  }

  /**
   * Get a specific preference
   */
  getPreference(key, defaultValue = null) {
    const prefs = this.getPreferences();
    return prefs[key] ?? defaultValue;
  }

  /**
   * Set a specific preference
   */
  setPreference(key, value) {
    const prefs = this.getPreferences();
    prefs[key] = value;
    this.setPreferences(prefs);
  }

  /**
   * Clear all stored data
   */
  clearAll() {
    this.store.clear();
  }

  /**
   * Get the last access timestamp
   */
  getLastAccess() {
    return this.store.get('lastAccess');
  }
}

module.exports = SecureStorage;
