const { expoRouterBabelPlugin } = require('babel-preset-expo/build/expo-router-plugin');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required in npm workspaces: babel-preset-expo is hoisted to the repo root
      // and cannot resolve expo-router from apps/mobile, so this plugin is skipped.
      expoRouterBabelPlugin,
      'react-native-reanimated/plugin',
    ],
  };
};
