/**
 * Preload script for YouTube Studio app
 * Runs in a sandboxed context with limited access
 * Provides secure bridge between renderer and main process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose only safe, limited APIs to the renderer process
contextBridge.exposeInMainWorld('youtubeStudioApp', {
  // App info
  getVersion: () => '1.0.0',
  
  // Platform info
  platform: process.platform,
  
  // Safe navigation
  goBack: () => {
    ipcRenderer.send('navigation', 'back');
  },
  
  goForward: () => {
    ipcRenderer.send('navigation', 'forward');
  },
  
  reload: () => {
    ipcRenderer.send('navigation', 'reload');
  },
  
  // Notification when page is ready
  onPageReady: (callback) => {
    window.addEventListener('DOMContentLoaded', callback);
  }
});

// Security: Prevent prototype pollution
Object.freeze(Object.prototype);
Object.freeze(Array.prototype);

// Log security info in development
console.log('YouTube Studio App - Preload script loaded');
console.log('Context isolation:', process.contextIsolated);
console.log('Sandboxed:', process.sandboxed);
