import * as Crypto from 'expo-crypto';
import { tokenStorage } from './tokenStorage';

const GUEST_ORDER_TOKEN_KEY = 'guestOrderDeviceToken';

export async function getGuestOrderToken() {
  const existing = await tokenStorage.getItemAsync(GUEST_ORDER_TOKEN_KEY);
  if (existing) return existing;
  const token = `${Crypto.randomUUID()}${Crypto.randomUUID()}`;
  await tokenStorage.setItemAsync(GUEST_ORDER_TOKEN_KEY, token);
  return token;
}
