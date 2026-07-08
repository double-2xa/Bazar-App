const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Pin React to a single copy — prevents duplicate React on web
const reactPath = path.resolve(workspaceRoot, 'node_modules/react');
const reactDomPath = path.resolve(workspaceRoot, 'node_modules/react-dom');

config.resolver.extraNodeModules = {
  react: reactPath,
  'react-dom': reactDomPath,
};

const webNativeOnlyModules = ['react-native-maps'];

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webNativeOnlyModules.includes(moduleName)) {
    return { type: 'empty' };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
