import './globals.css';
import { SuiWalletProvider } from './providers/SuiWalletProvider';

export const metadata = {
  title: "CATSINO - Caesar's Casino on Sui",
  description: "Quantum cat coin flip on Sui - 49% win rate, instant payouts, much cheaper than Solana",
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
      <body className="bg-white min-h-screen font-space text-caesar-black antialiased">
        <SuiWalletProvider>
          {children}
        </SuiWalletProvider>
      </body>
    </html>
  );
}