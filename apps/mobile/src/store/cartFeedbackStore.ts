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
  clearAdded: (id: number) => void;
};

let nextEventId = 0;

export const useCartFeedbackStore = create<CartFeedbackState>((set) => ({
  event: null,
  showAdded: (input) => set({ event: { ...input, id: ++nextEventId } }),
  clearAdded: (id) => set((state) => state.event?.id === id ? { event: null } : state),
}));
