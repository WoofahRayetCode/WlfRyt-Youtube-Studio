const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function run(command, options = {}) {
  log(`> ${command}`, 'blue');
  try {
    execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    log(`Error executing: ${command}`, 'red');
    process.exit(1);
  }
}

// Get platform from args or detect
const args = process.argv.slice(2);
let platform = args[0] || process.platform;

// Map platform names
const platformMap = {
  'win': 'win',
  'win32': 'win',
  'windows': 'win',
  'mac': 'mac',
  'darwin': 'mac',
  'macos': 'mac',
  'linux': 'linux',
  'all': 'all'
};

platform = platformMap[platform] || platform;

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const packageJson = require(path.join(rootDir, 'package.json'));

log(`\n========================================`, 'green');
log(`  WlfRyt YouTube Studio Build Script`, 'green');
log(`  Version: ${packageJson.version}`, 'green');
log(`========================================\n`, 'green');

// Clean dist folder
log('Cleaning dist folder...', 'yellow');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

// Install dependencies if needed
if (!fs.existsSync(path.join(rootDir, 'node_modules'))) {
  log('Installing dependencies...', 'yellow');
  run('npm install', { cwd: rootDir });
}

// Build based on platform
log(`\nBuilding for platform: ${platform}`, 'yellow');

switch (platform) {
  case 'win':
    log('\nBuilding Windows installer...', 'yellow');
    run('npx electron-builder --win', { cwd: rootDir });
    break;
    
  case 'mac':
    log('\nBuilding macOS app...', 'yellow');
    run('npx electron-builder --mac', { cwd: rootDir });
    break;
    
  case 'linux':
    log('\nBuilding Linux app...', 'yellow');
    run('npx electron-builder --linux', { cwd: rootDir });
    break;
    
  case 'all':
    log('\nBuilding for all platforms...', 'yellow');
    run('npx electron-builder --win --mac --linux', { cwd: rootDir });
    break;
    
  default:
    log(`Unknown platform: ${platform}`, 'red');
    log('Usage: node build.js [win|mac|linux|all]', 'yellow');
    process.exit(1);
}

log(`\n========================================`, 'green');
log(`  Build Complete!`, 'green');
log(`  Output: ${distDir}`, 'green');
log(`========================================\n`, 'green');

// List built files
if (fs.existsSync(distDir)) {
  log('Built files:', 'yellow');
  const files = fs.readdirSync(distDir);
  files.forEach(file => {
    const filePath = path.join(distDir, file);
    const stats = fs.statSync(filePath);
    if (stats.isFile()) {
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      log(`  - ${file} (${sizeMB} MB)`, 'reset');
    }
  });
}
