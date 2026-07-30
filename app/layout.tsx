import type { Metadata } from 'next';
import './globals.css';

const siteOrigin =
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://danny-algorithm-studio.perojevicdanny.chatgpt.site';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const socialImage = new URL(`${basePath}/og.jpg`, siteOrigin).toString();

export const metadata: Metadata = {
  title: 'Algorithm Studio — See code become structure',
  description:
    'Write, run, reverse, and understand algorithms through live visual execution.',
  metadataBase: new URL(siteOrigin),
  openGraph: {
    title: 'Algorithm Studio',
    description: 'See code become structure.',
    type: 'website',
    images: [
      {
        url: socialImage,
        width: 1200,
        height: 630,
        alt: 'Equations written in chalk on a classroom board',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Algorithm Studio',
    description: 'See code become structure.',
    images: [socialImage],
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
