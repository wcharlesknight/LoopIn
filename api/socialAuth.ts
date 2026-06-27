import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import appleAuth from '@invertase/react-native-apple-authentication';
import {GOOGLE_WEB_CLIENT_ID} from '../constants/auth';

/**
 * Social sign-in providers. Every provider funnels into the same Firebase credential flow
 * (see {@link signInWithProvider}); only the step that obtains the credential differs.
 */
export type SocialProvider = 'google' | 'apple';

/** Thrown when the user dismisses the provider's sign-in sheet — callers should treat this as a no-op. */
export class SocialSignInCancelled extends Error {
  constructor() {
    super('SOCIAL_SIGN_IN_CANCELLED');
    this.name = 'SocialSignInCancelled';
  }
}


/**
 * Thrown when the chosen provider's email already belongs to an account created with a different
 * provider and Firebase refuses to auto-merge it. The UI should ask the user to sign in with
 * `existingMethods[0]` first, then call {@link linkPendingCredential} to attach the new provider.
 */
export class AccountExistsWithDifferentCredentialError extends Error {
  constructor(
    public email: string,
    public existingMethods: string[],
    public pendingCredential: FirebaseAuthTypes.AuthCredential,
  ) {
    super('ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL');
    this.name = 'AccountExistsWithDifferentCredentialError';
  }
}

let googleConfigured = false;

function configureGoogle(): void {
  if (!googleConfigured) {
    console.log('[GoogleSignin] Configuring with clientId:', GOOGLE_WEB_CLIENT_ID);
    GoogleSignin.configure({webClientId: GOOGLE_WEB_CLIENT_ID});
    googleConfigured = true;
  }
}

async function googleCredential(): Promise<FirebaseAuthTypes.AuthCredential> {
  console.log('[google] Starting credential flow');
  configureGoogle();
  try {
    console.log('[google] Checking Play Services');
    await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
    console.log('[google] Play Services check passed, calling signIn()');
    const response = await GoogleSignin.signIn();
    console.log('[google] signIn() returned:', response);
    if (!isSuccessResponse(response)) {
      console.warn('[google] Response was not successful, type:', response.type);
      throw new SocialSignInCancelled();
    }
    const {idToken} = response.data;
    console.log('[google] Got idToken:', !!idToken);
    if (!idToken) {
      throw new Error('Google sign-in did not return an ID token');
    }
    console.log('[google] Creating Firebase credential');
    return auth.GoogleAuthProvider.credential(idToken);
  } catch (e) {
    console.error('[google] Credential error:', e);
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new SocialSignInCancelled();
    }
    throw e;
  }
}

async function appleCredential(): Promise<FirebaseAuthTypes.AuthCredential> {
  console.log('[apple] Starting credential flow');
  try {
    console.log('[apple] Calling performRequest()');
    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });
    console.log('[apple] performRequest() returned:', response);

    if (!response.identityToken) {
      throw new Error('Apple sign-in did not return an identity token');
    }

    console.log('[apple] Creating Firebase credential');
    return auth.AppleAuthProvider.credential(response.identityToken, response.nonce);
  } catch (e: any) {
    console.error('[apple] Credential error:', e);
    if (e.code === appleAuth.Error.CANCELED) {
      throw new SocialSignInCancelled();
    }
    throw e;
  }
}

/** Obtains a Firebase credential from the given provider's native SDK. */
function credentialFor(
  provider: SocialProvider,
): Promise<FirebaseAuthTypes.AuthCredential> {
  switch (provider) {
    case 'google':
      return googleCredential();
    case 'apple':
      return appleCredential();
  }
}

/**
 * Signs the user into Firebase with the chosen social provider, auto-linking by verified email
 * where Firebase allows it. On a collision Firebase won't merge, this surfaces an
 * {@link AccountExistsWithDifferentCredentialError} for the UI to drive the link flow.
 *
 * @returns the signed-in Firebase user. Routing (onboarding vs. home) is handled by the
 *          existing `onAuthStateChanged` + Firestore profile listener after `syncLogin`.
 */
export async function signInWithProvider(
  provider: SocialProvider,
): Promise<FirebaseAuthTypes.User> {
  const credential = await credentialFor(provider);
  try {
    const result = await auth().signInWithCredential(credential);
    return result.user;
  } catch (e: any) {
    if (e?.code === 'auth/account-exists-with-different-credential') {
      const email: string = e.email ?? e.userInfo?.email ?? '';
      const methods = email
        ? await auth().fetchSignInMethodsForEmail(email)
        : [];
      throw new AccountExistsWithDifferentCredentialError(
        email,
        methods,
        credential,
      );
    }
    throw e;
  }
}

/**
 * Completes account linking after the user has re-authenticated with their original provider.
 * Call with the `pendingCredential` from {@link AccountExistsWithDifferentCredentialError} once
 * `auth().currentUser` is the original account.
 */
export async function linkPendingCredential(
  pendingCredential: FirebaseAuthTypes.AuthCredential,
): Promise<FirebaseAuthTypes.User> {
  const current = auth().currentUser;
  if (!current) {
    throw new Error('Cannot link credential: no signed-in user');
  }
  const result = await current.linkWithCredential(pendingCredential);
  return result.user;
}
