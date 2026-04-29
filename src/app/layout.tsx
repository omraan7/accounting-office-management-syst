import type { Metadata } from 'next';
import { Almarai } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/Navbar';

const almarai = Almarai({
  subsets: ['arabic'],
  weight: ['300', '400', '700', '800'],
  variable: '--font-almarai',
});

export const metadata: Metadata = {
  title: 'مكتب محمد هاشم علي | الإدارة الرقمية',
  description: 'نظام متكامل لإدارة مكاتب المحاسبة القانونية وتتبع المهام.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${almarai.variable} font-sans bg-white text-gray-900 pt-20`} suppressHydrationWarning>
        <Navbar />
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
