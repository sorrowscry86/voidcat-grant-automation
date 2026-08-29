import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * The Workers API this app talks to. Overridable at build time via
 * EXPO_PUBLIC_API_BASE_URL so staging builds can point elsewhere.
 */
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'https://grant-search-api.sorrowscry86.workers.dev'
).replace(/\/+$/, '');

export const WEB_APP_URL = 'https://sorrowscry86.github.io/voidcat-grant-automation';
export const PRIVACY_POLICY_URL = `${WEB_APP_URL}/privacy-policy.html`;
export const TERMS_URL = `${WEB_APP_URL}/terms-of-service.html`;
export const SUPPORT_EMAIL = 'support@voidcat.org';

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/**
 * Apple forbids linking to external purchase flows for digital subscriptions
 * (App Store Review Guideline 3.1.1), so the upgrade path is hidden on iOS.
 * Subscriptions purchased on the web still unlock everything on every platform.
 */
export const SHOW_UPGRADE_PATH = Platform.OS !== 'ios';
