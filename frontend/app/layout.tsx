import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import Providers from '@/components/Providers';
import PwaRegister from '@/components/PwaRegister';
import './globals.css';

const manrope = Manrope({ subsets: ['latin', 'cyrillic'], variable: '--font-manrope', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Kichkintoy — bog‘cha va repetitor toping', template: '%s · Kichkintoy' },
  description: 'O‘zbekistondagi bog‘chalar va repetitorlarni qidiring, solishtiring va ariza yuboring.',
  manifest: '/manifest.json',
  applicationName: 'Kichkintoy',
  appleWebApp: { capable: true, title: 'Kichkintoy', statusBarStyle: 'default' },
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon-192.png' },
};
export const viewport: Viewport = { themeColor: '#245C43', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz" className={manrope.variable}>
      <body><Providers>{children}<PwaRegister /></Providers></body>
    </html>
  );
}
