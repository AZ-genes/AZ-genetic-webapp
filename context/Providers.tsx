'use client';

import { HederaWalletProvider } from './HederaWalletContext';
import { ToastProvider } from './ToastContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HederaWalletProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </HederaWalletProvider>
  );
}

