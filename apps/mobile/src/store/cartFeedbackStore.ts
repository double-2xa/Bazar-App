import { create } from 'zustand';

export type CartFeedbackOrigin = { x: number; y: number };

type CartFeedbackEvent = {
  id: number;
  productName: string;
  imageUrl?: string;
  quantity: number;
  origin?: CartFeedbackOrigin;
};

type CartFeedbackState = {
  event: CartFeedbackEvent | null;
  showAdded: (input: Omit<CartFeedbackEvent, 'id'>) => void;
};

let nextEventId = 0;

export const useCartFeedbackStore = create<CartFeedbackState>((set) => ({
  event: null,
  showAdded: (input) => set({ event: { ...input, id: ++nextEventId } }),
}));
