const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// Compiles global.css with Tailwind and injects the result into the native bundle.
module.exports = withNativeWind(config, { input: './global.css' })
