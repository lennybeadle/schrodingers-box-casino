import './globals.css';
import { SuiWalletProvider } from './providers/SuiWalletProvider';
import { ThemeProvider } from '@/contexts/ThemeContext';

export const metadata = {
  title: "CatsinoFun - Purr-fect Casino Games on Sui",
  description: "The ultimate cat-themed casino on Sui blockchain. Play CatFlip CoinFlip and Revolver Roulette with instant payouts, provably fair outcomes, and feline fun!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="bg-white dark:bg-gray-900 min-h-screen font-space text-caesar-black dark:text-gray-100 antialiased transition-colors duration-300">
        <ThemeProvider>
          <SuiWalletProvider>
            {children}
          </SuiWalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}