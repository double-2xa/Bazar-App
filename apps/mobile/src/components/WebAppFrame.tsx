import React from 'react';

/** Native: no chrome — pass children through unchanged. */
export function WebAppFrame({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
