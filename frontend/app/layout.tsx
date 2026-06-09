import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import NextTopLoader from 'nextjs-toploader';
import { Toaster } from '@/components/ui/sonner';
import { StoreProvider } from '@/store/store-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nazoratchi AI',
  description: 'Amir kompaniyasi — davomat va savdo nazorati',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="uz" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <NextTopLoader
          color="oklch(0.54 0.17 268)"
          height={3}
          shadow="0 0 8px oklch(0.54 0.17 268 / 0.5)"
          showSpinner={false}
        />
        <StoreProvider>
          {children}
          <Toaster position="bottom-right" />
        </StoreProvider>
      </body>
    </html>
  );
}
