import { registerRootComponent } from 'expo';
import axios from 'axios';

// Bypass localtunnel warning page
axios.defaults.headers.common['Bypass-Tunnel-Reminder'] = 'true';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
