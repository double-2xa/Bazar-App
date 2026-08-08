import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Web document shell only — not used by iOS/Android.
 * Viewport + base styles so phones, tablets, and laptops all scale correctly.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#FFF8E7" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
html, body, #root {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
}
html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
body {
  overflow: hidden;
  background-color: #FFF8E7;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
#root {
  display: flex;
  flex: 1;
  min-height: 100%;
  min-height: 100dvh;
  width: 100%;
}
/* Allow natural scrolling containers inside RN-web without rubber-banding the page */
#root, #root > div {
  max-width: 100%;
}
@media (min-width: 640px) {
  body {
    background-color: #FFF3D6;
  }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
