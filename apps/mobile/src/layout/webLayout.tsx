import { createContext, useContext, useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { spacing } from '@/theme';

/** Phone / small browser. */
export const WEB_PHONE_BREAKPOINT = 640;
/** Tablet / small laptop. */
export const WEB_TABLET_BREAKPOINT = 1024;

export type WebBreakpoint = 'phone' | 'tablet' | 'desktop';

type WebLayoutValue = {
  width: number;
  breakpoint: WebBreakpoint;
  productColumns: number;
  categoryColumns: number;
};

const WebLayoutContext = createContext<WebLayoutValue | null>(null);

export const WebLayoutProvider = WebLayoutContext.Provider;

export function getWebBreakpoint(windowWidth: number): WebBreakpoint {
  if (windowWidth < WEB_PHONE_BREAKPOINT) return 'phone';
  if (windowWidth < WEB_TABLET_BREAKPOINT) return 'tablet';
  return 'desktop';
}

/** Full viewport width — web storefront is edge-to-edge. */
export function getWebContentWidth(windowWidth: number): number {
  return windowWidth;
}

export function getProductColumns(contentWidth: number, platform: string = Platform.OS): number {
  // Keep the native app on a 2-column product grid.
  if (platform !== 'web') return 2;
  if (contentWidth >= 1000) return 4;
  if (contentWidth >= 700) return 3;
  return 2;
}

export function getCategoryColumns(contentWidth: number, platform: string = Platform.OS): number {
  if (platform !== 'web') return 2;
  if (contentWidth >= 1000) return 4;
  if (contentWidth >= 700) return 3;
  return 2;
}

export function createWebLayoutValue(windowWidth: number): WebLayoutValue {
  const width = getWebContentWidth(windowWidth);
  return {
    width,
    breakpoint: getWebBreakpoint(windowWidth),
    productColumns: getProductColumns(width),
    categoryColumns: getCategoryColumns(width),
  };
}

/** Content width used for cards/heroes (full viewport on web). */
export function useAppLayoutWidth(): number {
  const { width } = useWindowDimensions();
  const layout = useContext(WebLayoutContext);
  return layout?.width ?? width;
}

export function useWebBreakpoint(): WebBreakpoint {
  const { width } = useWindowDimensions();
  const layout = useContext(WebLayoutContext);
  if (layout) return layout.breakpoint;
  return Platform.OS === 'web' ? getWebBreakpoint(width) : 'phone';
}

/** Product grid columns — always 2 on native. */
export function useProductGridColumns(): number {
  const layoutWidth = useAppLayoutWidth();
  return getProductColumns(layoutWidth);
}

/** Category grid columns — always 2 on native. */
export function useCategoryGridColumns(): number {
  const layoutWidth = useAppLayoutWidth();
  return getCategoryColumns(layoutWidth);
}

/** Card width for a product grid with the current column count. */
export function useProductCardWidth(): number {
  const layoutWidth = useAppLayoutWidth();
  const columns = useProductGridColumns();
  return useMemo(
    () => (layoutWidth - spacing.md * (columns + 1)) / columns,
    [layoutWidth, columns],
  );
}
