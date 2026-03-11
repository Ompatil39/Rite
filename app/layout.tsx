import type {Metadata} from 'next';
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css'; // Global styles
import FloatingNavLayout from '@/components/floating-nav-layout';
import ThemeToggle from '@/components/theme-toggle';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-display',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Obsidian - Premium Habit Tracking',
  description: 'Premium Habit Tracking and To-Do list',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`dark ${cormorant.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning style={{ margin: 0, padding: 0, fontFamily: "var(--font-body), sans-serif", backgroundColor: "var(--bg-base, #0a0a0a)", color: "var(--text-main, #d0d0d0)", transition: "background-color 0.3s, color 0.3s" }}>
        <FloatingNavLayout>
          {children}
        </FloatingNavLayout>
        <ThemeToggle />
      </body>
    </html>
  );
}
