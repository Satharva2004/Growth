// metro.config.js - Custom Metro configuration with port 8082
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Change the default Metro bundler port from 8081 to 8082
config.server = {
  ...config.server,
  port: 8082,
};

module.exports = config;