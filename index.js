import { AppRegistry } from 'react-native';
import { ExpoRoot } from 'expo-router';
// Import the background task
import smsTask from './utils/smsTask';
import { name as appName } from './app.json';

// Must be a require in older valid headless setups, but import is fine usually.
// Register the Headless Task
AppRegistry.registerHeadlessTask('SmsHeadlessTask', () => smsTask);

// Register the Main Application
// Expo Router's entry component
export function App() {
    const ctx = require.context('./app');
    return <ExpoRoot context={ctx} />;
}

AppRegistry.registerComponent('main', () => App);
AppRegistry.registerComponent(appName, () => App);
