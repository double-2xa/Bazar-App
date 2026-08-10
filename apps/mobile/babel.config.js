module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Zustand ESM uses import.meta; Metro serves classic scripts on web.
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};
