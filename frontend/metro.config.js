// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// Use a stable on-disk store (shared across web/android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

// Fix nanoid/non-secure module resolution
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'nanoid': path.resolve(__dirname, 'node_modules/nanoid'),
};

// Prioritize platform-specific extensions
config.resolver.sourceExts = ['web.tsx', 'web.ts', 'web.jsx', 'web.js', ...config.resolver.sourceExts];

// Ensure proper resolution of problematic modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Fix nanoid/non-secure
  if (moduleName === 'nanoid/non-secure') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/nanoid/non-secure/index.js'),
      type: 'sourceFile',
    };
  }
  
  // Fix BaseViewConfig for React Native 0.79+
  if (moduleName === './BaseViewConfig') {
    // Use platform-specific file if available, fallback to android
    const platformFile = platform === 'ios' 
      ? 'BaseViewConfig.ios.js' 
      : 'BaseViewConfig.android.js';
    return {
      filePath: path.resolve(__dirname, `node_modules/react-native/Libraries/NativeComponent/${platformFile}`),
      type: 'sourceFile',
    };
  }
  
  // Use default resolver for everything else
  return context.resolveRequest(context, moduleName, platform);
};

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

module.exports = config;
