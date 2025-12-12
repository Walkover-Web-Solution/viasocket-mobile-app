import './gesture-handler';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './src/App';
import LogRocket from '@logrocket/react-native';

LogRocket.init('qqvlyi/viasocket-mobile-app');

AppRegistry.registerComponent(appName, () => App);
