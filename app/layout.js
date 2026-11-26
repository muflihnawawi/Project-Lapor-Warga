import './globals.css';
import Providers from '@/components/Providers';

export const metadata = {
  title: { default: 'LaporWarga — Laporkan, Pantau, Selesaikan', template: '%s · LaporWarga' },
  description: 'Platform pelaporan masalah lingkungan dan fasilitas umum untuk masyarakat.',
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#1a7e54' };

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
