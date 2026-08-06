import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

function resolveClientId(): string {
  const web = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const ios = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const android = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  const platformId =
    Platform.OS === 'ios' ? ios || web : Platform.OS === 'android' ? android || web : web;

  if (!platformId) {
    throw new Error('Google Sign-In is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
  }
  return platformId;
}

/** Opens Google OAuth and returns an ID token for POST /auth/google. */
export async function getGoogleIdToken(): Promise<string> {
  const clientId = resolveClientId();
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'nicepricebazar',
  });

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
