// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web ships its SQLite engine as a .wasm asset (only used by the web preview).
config.resolver.assetExts.push('wasm');

module.exports = config;
