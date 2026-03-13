import type { Metadata } from 'next';
import { AuthProvider } from '@/hooks/use-auth';
import { FirebaseProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import './globals.css';

export const metadata: Metadata = {
  title: 'Reels 08小隊 - 影片Comment',
  description: '專業的影片審閱與協作平台',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Noto+Sans+TC:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased')}>
        <FirebaseProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
