import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

function resolveWebClientId(): string {
  const web = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!web) {
    throw new Error('Google Sign-In is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
  }
  return web;
}

function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/** Browser OAuth — only valid on web (https/localhost). Google blocks exp:// redirects. */
async function getGoogleIdTokenViaBrowser(): Promise<string> {
  const clientId = resolveWebClientId();
  if (typeof window === 'undefined') {
    throw new Error('Browser Google Sign-In is only available on web.');
  }
  const redirectUri = `${window.location.origin}/`;

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    responseType: AuthSession.ResponseType.IdToken,
    usePKCE: false,
    extraParams: {
      nonce: Math.random().toString(36).slice(2),
    },
  });

  await request.makeAuthUrlAsync(discovery);
  const result = await request.promptAsync(discovery);

  if (result.type === 'dismiss' || result.type === 'cancel') {
    throw new Error('Google Sign-In was cancelled');
  }
  if (result.type !== 'success') {
    throw new Error('Google Sign-In failed');
  }

  const idToken = result.params.id_token;
  if (!idToken) {
    throw new Error('No ID token returned from Google');
  }
  return idToken;
}

/** Native Google Sign-In — requires a development build (not Expo Go). */
async function getGoogleIdTokenNative(): Promise<string> {
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } =
    await import('@react-native-google-signin/google-signin');

  const webClientId = resolveWebClientId();
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

  GoogleSignin.configure({
    webClientId,
    iosClientId: iosClientId || undefined,
    offlineAccess: false,
  });

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  try {
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      throw new Error('Google Sign-In was cancelled');
    }

    // Prefer tokens from the sign-in response; fall back to getTokens().
    let idToken = response.data.idToken;
    if (!idToken) {
      const tokens = await GoogleSignin.getTokens();
      idToken = tokens.idToken;
    }
    if (!idToken) {
      throw new Error(
        'No ID token from Google. Ensure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is the Web client ID, and an Android OAuth client exists for com.nicepricebazar.app + your SHA-1.',
      );
    }
    return idToken;
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Google Sign-In was cancelled');
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Google Sign-In already in progress');
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services is not available on this device');
      }
    }
    throw error;
  }
}

/** Opens Google Sign-In and returns an ID token for POST /auth/google. */
export async function getGoogleIdToken(): Promise<string> {
  if (Platform.OS === 'web') {
    return getGoogleIdTokenViaBrowser();
  }

  if (isExpoGo()) {
    throw new Error(
      'Google Sign-In cannot run in Expo Go — Google blocks exp:// redirects. Use a development build: from apps/mobile run `npx expo run:android`.',
    );
  }

  return getGoogleIdTokenNative();
}
