const { app, BrowserWindow, session, Menu, shell, dialog, Tray, nativeImage } = require('electron');
const path = require('path');
const AutoLaunch = require('auto-launch');
const SecureStorage = require('./secureStorage');
const { setupSecurityPolicy } = require('./security');

// Disable hardware acceleration if causing issues
// app.disableHardwareAcceleration();

// Auto-launch configuration
const autoLauncher = new AutoLaunch({
  name: 'WlfRyt YouTube Studio',
  path: app.getPath('exe'),
  isHidden: true // Start minimized
});

// Handle certificate errors - allow Google/YouTube certificates
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // Allow all Google/YouTube domains
  try {
    const urlObj = new URL(url);
    const trustedDomains = ['google.com', 'youtube.com', 'googleapis.com', 'gstatic.com', 'ytimg.com', 'googleusercontent.com', 'googlevideo.com'];
    const isTrusted = trustedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );
    if (isTrusted) {
      event.preventDefault();
      callback(true);
      return;
    }
  } catch (e) {
    console.error('Certificate check error:', e);
  }
  callback(false);
});

// Single instance lock - prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;
let secureStorage = null;
let tray = null;
let isQuitting = false;

// YouTube Studio URL
const YOUTUBE_STUDIO_URL = 'https://studio.youtube.com/';

// Allowed domains for navigation
const ALLOWED_DOMAINS = [
  'studio.youtube.com',
  'youtube.com',
  'www.youtube.com',
  'accounts.google.com',
  'accounts.youtube.com',
  'myaccount.google.com',
  'google.com',
  'www.google.com',
  'gstatic.com',
  'googleapis.com',
  'googleusercontent.com',
  'ytimg.com',
  'ggpht.com',
  'googlevideo.com',
  'youtube-nocookie.com',
  'youtu.be',
  'googleadservices.com',
  'googlesyndication.com',
  'doubleclick.net',
  'google-analytics.com',
  'googletagmanager.com',
  'gvt1.com',
  'gvt2.com',
  'gvt3.com',
  'play.google.com',
  'ssl.gstatic.com',
  'fonts.gstatic.com',
  'fonts.googleapis.com',
  'lh3.googleusercontent.com',
  'youtube.googleapis.com',
  'jnn-pa.googleapis.com',
  'clients1.google.com',
  'clients2.google.com',
  'clients3.google.com',
  'clients4.google.com',
  'clients5.google.com',
  'clients6.google.com',
  'signaler-pa.googleapis.com',
  'content-autofill.googleapis.com',
  'realtimesupport.youtube.com',
  'yt3.ggpht.com',
  'i.ytimg.com',
  'www.googletagmanager.com',
  'consent.youtube.com',
  'consent.google.com',
  'ogs.google.com',
  'notifications.google.com',
  'update.googleapis.com'
];

function isAllowedDomain(url) {
  try {
    const urlObj = new URL(url);
    return ALLOWED_DOMAINS.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

async function createWindow() {
  // Initialize secure storage
  secureStorage = new SecureStorage();
  
  // Get saved window bounds
  const windowBounds = secureStorage.getWindowBounds();
  
  // Check if should start minimized
  const startMinimized = secureStorage.getPreference('startMinimized', false);
  
  mainWindow = new BrowserWindow({
    width: windowBounds.width || 1400,
    height: windowBounds.height || 900,
    x: windowBounds.x,
    y: windowBounds.y,
    minWidth: 800,
    minHeight: 600,
    title: 'WlfRyt YouTube Studio',
    icon: path.join(__dirname, '../assets/WlfRyt-Youtube-Studio-Icon-Cropped.png'),
    webPreferences: {
      // Security hardening
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      enableBlinkFeatures: '',
      // Partition for session isolation
      partition: 'persist:youtube-studio',
      // Preload script for additional security
      preload: path.join(__dirname, 'preload.js'),
      // Spellcheck
      spellcheck: true
    },
    show: false, // Don't show until ready
    backgroundColor: '#1f1f1f' // YouTube dark theme background
  });

  // Setup security policies
  setupSecurityPolicy(mainWindow);

  // Setup session with persistent cookies
  await setupSession();

  // Create application menu
  createMenu();
  
  // Create system tray
  createTray();

  // Handle window ready to show
  mainWindow.once('ready-to-show', () => {
    if (startMinimized) {
      // Start minimized to tray
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    // Save window bounds before quitting
    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
      secureStorage.setWindowBounds(bounds);
    }
  });

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedDomain(url)) {
      return { action: 'allow' };
    }
    // Open external links in default browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to non-allowed domains
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedDomain(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Handle new window requests
  mainWindow.webContents.on('did-create-window', (childWindow) => {
    childWindow.webContents.on('will-navigate', (event, url) => {
      if (!isAllowedDomain(url)) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });
  });

  // Handle load failures - but be more lenient
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
    // Only show error for main frame failures, ignore subframe and minor errors
    // -3 = aborted, -6 = connection refused, -105 = name not resolved, -106 = internet disconnected
    if (isMainFrame && errorCode !== -3 && errorCode !== -27) {
      // Retry once before showing error
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(YOUTUBE_STUDIO_URL).catch(() => {
            mainWindow.loadFile(path.join(__dirname, 'error.html'));
          });
        }
      }, 1000);
    }
  });

  // Load YouTube Studio
  mainWindow.loadURL(YOUTUBE_STUDIO_URL).catch(err => {
    console.error('Initial load failed:', err);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function setupSession() {
  const ses = session.fromPartition('persist:youtube-studio');
  
  // Set a custom user agent to appear as a regular Chrome browser (updated version)
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  ses.setUserAgent(userAgent);
  
  // Handle permission checks (for checking permissions, not requesting)
  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    // Allow all permission checks for Google/YouTube domains
    return true;
  });

  // Enable persistent cookies
  ses.cookies.on('changed', (event, cookie, cause, removed) => {
    // Cookies are automatically persisted with 'persist:' partition
  });

  // Setup permission handler
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = [
      'notifications',
      'clipboard-read',
      'clipboard-sanitized-write',
      'media',
      'mediaKeySystem',
      'geolocation',
      'fullscreen',
      'pointerLock',
      'openExternal',
      'window-management',
      'local-fonts',
      'idle-detection',
      'storage-access',
      'top-level-storage-access',
      'camera',
      'microphone'
    ];
    
    callback(allowedPermissions.includes(permission));
  });

  // Block tracking and ads (optional - can be customized)
  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    // Allow all YouTube/Google related requests
    callback({ cancel: false });
  });
}

function createTray() {
  // Create tray icon
  const iconPath = path.join(__dirname, '../assets/WlfRyt-Youtube-Studio-Icon-Cropped.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open YouTube Studio',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: secureStorage.getPreference('autoStart', false),
      click: async (menuItem) => {
        const enabled = menuItem.checked;
        secureStorage.setPreference('autoStart', enabled);
        if (enabled) {
          await autoLauncher.enable();
        } else {
          await autoLauncher.disable();
        }
      }
    },
    {
      label: 'Start Minimized',
      type: 'checkbox',
      checked: secureStorage.getPreference('startMinimized', false),
      click: (menuItem) => {
        secureStorage.setPreference('startMinimized', menuItem.checked);
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('WlfRyt YouTube Studio');
  tray.setContextMenu(contextMenu);
  
  // Double-click to open window
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Go to YouTube Studio',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            if (mainWindow) {
              mainWindow.loadURL(YOUTUBE_STUDIO_URL);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Settings',
          submenu: [
            {
              label: 'Start with Windows',
              type: 'checkbox',
              checked: secureStorage.getPreference('autoStart', false),
              click: async (menuItem) => {
                const enabled = menuItem.checked;
                secureStorage.setPreference('autoStart', enabled);
                if (enabled) {
                  await autoLauncher.enable();
                } else {
                  await autoLauncher.disable();
                }
                // Recreate tray menu to sync state
                createTray();
              }
            },
            {
              label: 'Start Minimized to Tray',
              type: 'checkbox',
              checked: secureStorage.getPreference('startMinimized', false),
              click: (menuItem) => {
                secureStorage.setPreference('startMinimized', menuItem.checked);
                // Recreate tray menu to sync state
                createTray();
              }
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Clear Session Data',
          click: async () => {
            const result = await dialog.showMessageBox(mainWindow, {
              type: 'warning',
              buttons: ['Cancel', 'Clear Data'],
              defaultId: 0,
              title: 'Clear Session Data',
              message: 'This will log you out and clear all saved data. Are you sure?'
            });
            
            if (result.response === 1) {
              await clearSessionData();
              mainWindow.loadURL(YOUTUBE_STUDIO_URL);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Minimize to Tray',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            if (mainWindow) {
              mainWindow.hide();
            }
          }
        },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Navigation',
      submenu: [
        {
          label: 'Back',
          accelerator: 'Alt+Left',
          click: () => {
            if (mainWindow && mainWindow.webContents.canGoBack()) {
              mainWindow.webContents.goBack();
            }
          }
        },
        {
          label: 'Forward',
          accelerator: 'Alt+Right',
          click: () => {
            if (mainWindow && mainWindow.webContents.canGoForward()) {
              mainWindow.webContents.goForward();
            }
          }
        },
        {
          label: 'Refresh',
          accelerator: 'F5',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.reload();
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'YouTube Studio Help',
          click: () => {
            shell.openExternal('https://support.google.com/youtube/');
          }
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About WlfRyt YouTube Studio',
              message: 'WlfRyt YouTube Studio',
              detail: `Version: 1.0.0\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode.js: ${process.versions.node}\n\nA secure standalone app for YouTube Studio with persistent login.`
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function clearSessionData() {
  const ses = session.fromPartition('persist:youtube-studio');
  await ses.clearStorageData();
  await ses.clearCache();
  await ses.clearAuthCache();
  secureStorage.clearAll();
}

// App event handlers
app.on('second-instance', () => {
  if (mainWindow) {
    mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  // Don't quit on window close - app stays in tray
  // Only quit when explicitly requested
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.whenReady().then(async () => {
  await createWindow();
  
  // Sync auto-start setting on launch
  const autoStartEnabled = secureStorage.getPreference('autoStart', false);
  const isEnabled = await autoLauncher.isEnabled();
  if (autoStartEnabled && !isEnabled) {
    await autoLauncher.enable();
  } else if (!autoStartEnabled && isEnabled) {
    await autoLauncher.disable();
  }
});

// Security: Disable navigation to file: protocol
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.protocol === 'file:') {
      event.preventDefault();
    }
  });
});
