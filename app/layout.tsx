import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import FloatingNavLayout from '@/components/floating-nav-layout';
import ThemeToggle from '@/components/theme-toggle';
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script"; // <-- added

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Rite - Premium Habit Tracking',
  description: 'Premium Habit Tracking and To-Do list',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrainsMono.variable} ${cormorant.variable}`}
    >
      <body
        suppressHydrationWarning
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "var(--font-body), sans-serif",
          backgroundColor: "var(--bg-base, #111113)",
          color: "var(--text-main, #d0d0d0)",
          transition: "background-color 0.3s, color 0.3s",
        }}
      >
        <FloatingNavLayout>
          {children}
        </FloatingNavLayout>

        <ThemeToggle />

        {/* Microsoft Clarity */}
        <Script id="clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "vvjow9f336");
          `}
        </Script>

        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}