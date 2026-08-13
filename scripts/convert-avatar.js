#!/usr/bin/env node
// Converts a Mixamo FBX (character or animation) into a web-ready GLB.
// Usage: node scripts/convert-avatar.js "C:\path\to\Sitting Idle.fbx" public/avatars/sitting-idle.glb

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const [, , inputFbx, outputGlb] = process.argv;

if (!inputFbx || !outputGlb) {
  console.error('Usage: node scripts/convert-avatar.js <input.fbx> <output.glb>');
  process.exit(1);
}

const fbx2gltfBin = require.resolve(`fbx2gltf/bin/${process.platform === 'win32' ? 'Windows_NT' : process.platform === 'darwin' ? 'Darwin' : 'Linux'}/FBX2glTF${process.platform === 'win32' ? '.exe' : ''}`);

const outputDir = path.dirname(outputGlb);
fs.mkdirSync(outputDir, { recursive: true });

const rawGlb = outputGlb.replace(/\.glb$/, '.raw.glb');
const rawOutputBase = rawGlb.replace(/\.glb$/, '');

console.log('Converting FBX -> raw GLB...');
execFileSync(fbx2gltfBin, ['--binary', '--input', inputFbx, '--output', rawOutputBase], { stdio: 'inherit' });

console.log('Optimizing textures and geometry...');
execFileSync('npx', ['gltf-transform', 'optimize', rawGlb, outputGlb, '--texture-compress', 'webp', '--texture-size', '1024', '--compress', 'meshopt'], {
  stdio: 'inherit',
  shell: true,
});

fs.unlinkSync(rawGlb);

const { size } = fs.statSync(outputGlb);
console.log(`Done: ${outputGlb} (${(size / 1024).toFixed(0)} KB)`);
