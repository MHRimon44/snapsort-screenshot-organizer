import {TestIds} from 'react-native-google-mobile-ads';

// Test traffic must never use a production ad unit.
export const HOME_BANNER_ID = __DEV__
  ? TestIds.BANNER
  : 'ca-app-pub-3194644435083545/3737209183';
