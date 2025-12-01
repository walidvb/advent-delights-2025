import type { Metadata } from 'next';
import './globals.css';

const img = 'https://advent.diggersdelights.net/og-image.png';

export const metadata: Metadata = {
  title: 'Advent Delights',
  description: '25 days, 25 selectors, and 2 moods!',
  openGraph: {
    title: 'Advent Delights',
    description: '25 days, 25 selectors, and 2 moods!',
    url: 'https://advent.diggersdelights.net',
    siteName: 'Advent Delights',
    images: [
      {
        url: img,
        width: 2413,
        height: 1396,
        alt: 'Advent Delights',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Advent Delights',
    description: '25 days, 25 selectors, and 2 moods!',
    images: [img],
  },
  metadataBase: new URL('https://advent.diggersdelights.net'),
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
