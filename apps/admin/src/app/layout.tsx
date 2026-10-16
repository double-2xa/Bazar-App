import './globals.css';
import type { Metadata } from 'next';
import { BRAND } from '@doublea/shared';

export const metadata: Metadata = {
  title: `${BRAND.adminPanelTitle}`,
  description: `Admin dashboard for ${BRAND.shopName}`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions often inject attributes on <html>/<body>
    // (e.g. cz-shortcut-listen) before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
