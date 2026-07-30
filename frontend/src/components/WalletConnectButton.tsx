"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletConnectButton({ label = "Conectar carteira" }: { label?: string }) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;
        if (!ready) return null;
        if (!connected) {
          return (
            <button type="button" className="wallet-connect-readable" onClick={openConnectModal}>
              {label}
            </button>
          );
        }
        if (chain.unsupported) {
          return (
            <button type="button" className="wallet-connect-readable wallet-connect-readable--warn" onClick={openChainModal}>
              Trocar rede
            </button>
          );
        }
        return (
          <button type="button" className="wallet-connect-readable" onClick={openAccountModal}>
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
