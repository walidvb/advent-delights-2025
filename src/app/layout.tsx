import type { Metadata } from 'next';
import './globals.css';

const img = 'https://adventoz.pages.dev/og-image.png';

export const metadata: Metadata = {
  title: 'AdvenTOZ',
  description: '25 jours, 25 potes, and 2 humeurs!',
  openGraph: {
    title: 'AdvenTOZ',
    description: '25 jours, 25 potes, and 2 humeurs!',
    url: 'https://adventoz.pages.dev',
    siteName: 'Advent TOZ',
    images: [
      {
        url: img,
        width: 1200,
        height: 687,
        alt: 'Advent Delights',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AdvenTOZ',
    description: '25 jours, 25 potes, and 2 humeurs!',
    images: [img],
  },
  metadataBase: new URL('https://adventoz.pages.dev'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
