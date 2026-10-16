// Expo'nun varsayılan Metro ayarı; paketleyici en fazla 4 işçiyle çalışır.
// 16 çekirdekli makinede varsayılan işçi sayısı APK derlemesinde belleği tüketip Metro'yu çökertiyordu.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.maxWorkers = 4;

module.exports = config;
