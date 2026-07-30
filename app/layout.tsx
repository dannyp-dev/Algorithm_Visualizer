import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Algorithm Studio — See code become structure',
  description:
    'Write, run, reverse, and understand algorithms through live visual execution.',
  metadataBase: new URL('https://danny-algorithm-studio.chatgpt.site'),
  openGraph: {
    title: 'Algorithm Studio',
    description: 'See code become structure.',
    type: 'website',
    images: [
      {
        url: '/og.png',
        width: 1734,
        height: 909,
        alt: 'Algorithm Studio — See code become structure',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Algorithm Studio',
    description: 'See code become structure.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
