'use client';

import { WalletKitProvider, ConnectModal } from '@mysten/wallet-kit';

export function SuiWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WalletKitProvider
      features={[
        'sui:signAndExecuteTransactionBlock',
        'sui:signTransactionBlock'
      ]}
    >
      {children}
      <ConnectModal />
    </WalletKitProvider>
  );
}