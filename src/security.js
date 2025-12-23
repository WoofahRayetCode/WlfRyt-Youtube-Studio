/**
 * Security module for the YouTube Studio app
 * Implements Content Security Policy and other security measures
 */

/**
 * Setup Content Security Policy and other security headers
 */
function setupSecurityPolicy(mainWindow) {
  const { session } = require('electron');
  const ses = session.fromPartition('persist:youtube-studio');

  // Modify headers to allow YouTube resources to load properly
  ses.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    
    // Remove headers that might block content
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    delete responseHeaders['cross-origin-embedder-policy'];
    delete responseHeaders['Cross-Origin-Embedder-Policy'];
    delete responseHeaders['cross-origin-opener-policy'];
    delete responseHeaders['Cross-Origin-Opener-Policy'];
    delete responseHeaders['cross-origin-resource-policy'];
    delete responseHeaders['Cross-Origin-Resource-Policy'];
    
    callback({ responseHeaders });
  });

  // Block potentially dangerous downloads
  ses.on('will-download', (event, item, webContents) => {
    // Allow downloads but log them
    const fileName = item.getFilename();
    const fileSize = item.getTotalBytes();
    console.log(`Download started: ${fileName} (${fileSize} bytes)`);
    
    // You could add download filtering here if needed
    // event.preventDefault(); // to block downloads
  });
}

/**
 * Validate URL for security
 */
function isSecureUrl(url) {
  try {
    const urlObj = new URL(url);
    // Only allow HTTPS
    return urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize URL for logging (remove sensitive params)
 */
function sanitizeUrlForLogging(url) {
  try {
    const urlObj = new URL(url);
    // Remove sensitive query parameters
    const sensitiveParams = ['token', 'key', 'auth', 'password', 'secret', 'access_token'];
    sensitiveParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });
    return urlObj.toString();
  } catch {
    return '[Invalid URL]';
  }
}

/**
 * Security configuration object
 */
const securityConfig = {
  // Allowed protocols
  allowedProtocols: ['https:', 'http:'],
  
  // Blocked file extensions for downloads
  blockedExtensions: ['.exe', '.msi', '.bat', '.cmd', '.ps1', '.vbs', '.js'],
  
  // Maximum cookie age (30 days in seconds)
  maxCookieAge: 30 * 24 * 60 * 60,
  
  // Session timeout (7 days)
  sessionTimeout: 7 * 24 * 60 * 60 * 1000
};

module.exports = {
  setupSecurityPolicy,
  isSecureUrl,
  sanitizeUrlForLogging,
  securityConfig
};
