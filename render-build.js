#!/usr/bin/env node

// Render.com build script
// Ensures packages are built in correct dependency order

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting Render build process...');

// Detect package manager
const hasYarnLock = fs.existsSync('yarn.lock');
const pkgManager = hasYarnLock ? 'yarn' : 'npm';

console.log(`📦 Using ${pkgManager} package manager`);

// Install dependencies
console.log('📦 Installing dependencies...');
execSync(`${pkgManager} install`, { stdio: 'inherit' });

// Build packages in correct order
console.log('🔨 Building shared packages...');

// Build types package first
console.log('  → Building @interview-me/types...');
try {
  execSync(`${pkgManager} workspace @interview-me/types build`, { stdio: 'inherit' });
} catch (error) {
  console.log('❌ Workspace command failed, trying direct approach...');
  process.chdir('packages/types');
  execSync(`${pkgManager} run build`, { stdio: 'inherit' });
  process.chdir('../..');
}

// Verify types package was built
if (!fs.existsSync('packages/types/dist')) {
  console.log('❌ Types package not built properly, trying alternative approach...');
  process.chdir('packages/types');
  execSync(`${pkgManager} run build`, { stdio: 'inherit' });
  process.chdir('../..');
}

// Build UI package second
console.log('  → Building @interview-me/ui...');
try {
  execSync(`${pkgManager} workspace @interview-me/ui build`, { stdio: 'inherit' });
} catch (error) {
  console.log('❌ Workspace command failed, trying direct approach...');
  process.chdir('packages/ui');
  execSync(`${pkgManager} run build`, { stdio: 'inherit' });
  process.chdir('../..');
}

// Build API last
console.log('  → Building @interview-me/api...');
try {
  execSync(`${pkgManager} workspace @interview-me/api build`, { stdio: 'inherit' });
} catch (error) {
  console.log('❌ Workspace command failed, trying direct approach...');
  process.chdir('apps/api');
  execSync(`${pkgManager} run build`, { stdio: 'inherit' });
  process.chdir('../..');
}

console.log('✅ Build completed successfully!');
