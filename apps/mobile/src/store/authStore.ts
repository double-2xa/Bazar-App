import { create } from 'zustand';
import type { UserPublic, Product, PriceType } from '@doublea/shared';
import { authApi } from '../services/endpoints';
import { tokenStorage } from '../services/tokenStorage';

export interface GuestCartItem {
  productId: string;
  product: Product;
  quantity: number;
  selectedPriceType: PriceType;
}

interface AuthState {
  user: UserPublic | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showCompanyPrice: boolean;
  guestCart: GuestCartItem[];
  setUser: (user: UserPublic | null) => void;
  setLoading: (loading: boolean) => void;
  setShowCompanyPrice: (show: boolean) => void;
  login: (email: string, password: string) => Promise<UserPublic>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  addToGuestCart: (product: Product, quantity: number, priceType?: PriceType) => void;
  updateGuestCartItem: (productId: string, quantity: number, priceType?: PriceType) => void;
  removeFromGuestCart: (productId: string, priceType?: PriceType) => void;
  clearGuestCart: () => void;
  getGuestCartCount: () => number;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  showCompanyPrice: true,
  guestCart: [],

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),
  setShowCompanyPrice: (showCompanyPrice) => set({ showCompanyPrice }),

  login: async (email, password) => {
    const data = await authApi.login(email, password);
    await tokenStorage.setItemAsync('accessToken', data.tokens.accessToken);
    await tokenStorage.setItemAsync('refreshToken', data.tokens.refreshToken);
    set({ user: data.user, isAuthenticated: true });
    return data.user;
  },

  logout: async () => {
    const refreshToken = await tokenStorage.getItemAsync('refreshToken');
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        /* ignore */
      }
    }
    await tokenStorage.deleteItemAsync('accessToken');
    await tokenStorage.deleteItemAsync('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  loadSession: async () => {
    try {
      const token = await tokenStorage.getItemAsync('accessToken');
      if (token) {
        const user = await authApi.me();
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await tokenStorage.deleteItemAsync('accessToken');
      await tokenStorage.deleteItemAsync('refreshToken');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  addToGuestCart: (product, quantity, priceType = 'normal') => {
    const cart = get().guestCart;
    const existing = cart.find(
      (i) => i.productId === product.id && i.selectedPriceType === priceType,
    );
    if (existing) {
      set({
        guestCart: cart.map((i) =>
          i.productId === product.id && i.selectedPriceType === priceType
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        ),
      });
    } else {
      set({ guestCart: [...cart, { productId: product.id, product, quantity, selectedPriceType: priceType }] });
    }
  },

  updateGuestCartItem: (productId, quantity, priceType = 'normal') => {
    set({
      guestCart: get().guestCart.map((i) =>
        i.productId === productId && i.selectedPriceType === priceType ? { ...i, quantity } : i,
      ),
    });
  },

  removeFromGuestCart: (productId, priceType = 'normal') => {
    set({
      guestCart: get().guestCart.filter(
        (i) => !(i.productId === productId && i.selectedPriceType === priceType),
      ),
    });
  },

  clearGuestCart: () => set({ guestCart: [] }),

  getGuestCartCount: () => get().guestCart.reduce((sum, i) => sum + i.quantity, 0),
}));
