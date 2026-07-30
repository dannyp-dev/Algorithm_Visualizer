import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Algorithm Studio — See code become structure',
  description:
    'Write, run, reverse, and understand algorithms through live visual execution.',
  metadataBase: new URL('https://algorithm-studio.chatgpt.site'),
  openGraph: {
    title: 'Algorithm Studio',
    description: 'See code become structure.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Algorithm Studio',
    description: 'See code become structure.',
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
