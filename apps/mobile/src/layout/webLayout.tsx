import { createContext, useContext, useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { spacing } from '@/theme';

/** Phone / small browser — full bleed. */
export const WEB_PHONE_BREAKPOINT = 640;
/** Tablet / small laptop. */
export const WEB_TABLET_BREAKPOINT = 1024;
/** Max content width on large desktops. */
export const WEB_DESKTOP_MAX_WIDTH = 1180;
/** Max content width on tablets. */
export const WEB_TABLET_MAX_WIDTH = 840;

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

export function getWebContentWidth(windowWidth: number): number {
  const bp = getWebBreakpoint(windowWidth);
  if (bp === 'phone') return windowWidth;
  if (bp === 'tablet') return Math.min(windowWidth - 32, WEB_TABLET_MAX_WIDTH);
  return Math.min(windowWidth - 64, WEB_DESKTOP_MAX_WIDTH);
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

/** Content width used for cards/heroes (framed on web, window on native). */
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
