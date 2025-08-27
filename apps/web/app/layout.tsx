import './globals.css';
import { WalletContextProvider } from './providers/WalletContextProvider';

export const metadata = {
  title: "Schrödinger's Box - Web3 Casino",
  description: "Quantum cat coin flip on Solana - 50/50 odds, provable fairness",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="bg-gradient-to-br from-slate-50 via-purple-50/30 to-blue-50/50 min-h-screen font-space text-slate-900">
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  );
}