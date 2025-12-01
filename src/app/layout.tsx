import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Advent Delights',
  description: '25 days, 25 selectors, and 2 moods!',
  openGraph: {
    images: [
      {
        url: '/og-image.png',
        width: 2413,
        height: 1396,
      },
    ],
  },
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
