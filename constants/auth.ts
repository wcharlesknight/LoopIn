/**
 * OAuth "Web client" ID for the gatherus Firebase project.
 *
 * Required by @react-native-google-signin so Firebase can verify the Google ID token.
 * Find it after enabling the Google provider in the Firebase console:
 *   Authentication → Sign-in method → Google → Web SDK configuration → "Web client ID",
 * or the `client_type: 3` entry in the downloaded google-services.json.
 *
 * TODO(setup): replace the placeholder once Google sign-in is enabled in Firebase.
 */
export const GOOGLE_WEB_CLIENT_ID =
  '52323557504-pmri85jbego3ag02l2lccd62aevm7eas.apps.googleusercontent.com';
