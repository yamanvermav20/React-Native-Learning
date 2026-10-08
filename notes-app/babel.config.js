module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      // jsxImportSource lets NativeWind intercept className on core components.
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  }
}
