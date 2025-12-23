# WlfRyt YouTube Studio

A standalone desktop application for YouTube Studio with persistent login and hardened security.

## Features

- **Persistent Login**: Your Google/YouTube login session is saved securely, so you don't need to log in every time
- **Hardened Security**: 
  - Context isolation and sandbox mode enabled
  - Node integration disabled in renderer
  - Encrypted local storage for preferences
  - Machine-specific encryption keys
  - Strict Content Security Policy
  - Only allows navigation to YouTube/Google domains
- **Native Desktop Experience**: Runs as a standalone app with system menu, keyboard shortcuts, and window state persistence
- **Single Instance**: Prevents multiple instances from running

## Security Features

1. **Sandboxed Renderer Process**: The web content runs in a sandboxed environment with no direct access to Node.js APIs
2. **Context Isolation**: The preload script is isolated from the web page context
3. **Encrypted Storage**: Local preferences are encrypted with a machine-specific key
4. **Domain Whitelisting**: Only YouTube and Google domains are allowed for navigation
5. **Secure Session**: Cookies are stored in an encrypted partition
6. **No External Script Execution**: Prevents running potentially malicious code

## Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/WlfRyt/WlfRyt-Youtube-Studio.git
cd WlfRyt-Youtube-Studio
```

2. Install dependencies:
```bash
npm install
```

3. Run the app:
```bash
npm start
```

### Building for Distribution

Build for Windows:
```bash
npm run build:win
```

Build for macOS:
```bash
npm run build:mac
```

Build for Linux:
```bash
npm run build:linux
```

The built application will be in the `dist` folder.

## Usage

1. Launch the application
2. Sign in with your Google account when prompted
3. Your login session will be saved for future use
4. Use the menu or keyboard shortcuts for navigation:
   - `Ctrl+H` - Go to YouTube Studio home
   - `Alt+Left` - Go back
   - `Alt+Right` - Go forward
   - `F5` - Refresh

## Clearing Login Data

If you need to log out or clear your session data:
1. Go to **File** > **Clear Session Data**
2. Confirm the action
3. You'll be logged out and can sign in with a different account

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+H | Go to YouTube Studio Home |
| Alt+Left | Navigate Back |
| Alt+Right | Navigate Forward |
| F5 | Refresh |
| Ctrl+Plus | Zoom In |
| Ctrl+Minus | Zoom Out |
| Ctrl+0 | Reset Zoom |
| F11 | Toggle Fullscreen |

## Technical Details

- Built with Electron 28
- Uses persistent partition for cookie storage
- Implements electron-store for encrypted local storage
- Machine-specific encryption prevents data theft

## License

MIT License

## Disclaimer

This is an unofficial application. YouTube and YouTube Studio are trademarks of Google LLC.
