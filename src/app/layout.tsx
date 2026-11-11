import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const img = `${SITE_URL}/og-image.png`;

export const metadata: Metadata = {
  title: 'Advent Delights',
  description: '25 days, 25 selectors, and 2 moods!',
  openGraph: {
    title: 'Advent Delights',
    description: '25 days, 25 selectors, and 2 moods!',
    url: SITE_URL,
    siteName: 'Advent Delights',
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
    title: 'Advent Delights',
    description: '25 days, 25 selectors, and 2 moods!',
    images: [img],
  },
  metadataBase: new URL(SITE_URL),
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
