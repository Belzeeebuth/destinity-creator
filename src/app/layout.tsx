import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { IllustrativeBanner, SiteFooter, SiteHeader } from '@/components/site-chrome';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Destinity / bench — comparateur de modèles de langage',
    template: '%s — Destinity / bench',
  },
  description:
    'Comparez les modèles de langage sur la qualité, le coût par million de tokens et la fenêtre de contexte. Tarifs datés, sources citées.',
};

/**
 * Applique le thème choisi avant le premier rendu, pour éviter un flash de
 * thème clair chez un visiteur en sombre.
 */
const THEME_BOOTSTRAP = `
(function () {
  try {
    var stored = localStorage.getItem('destinity-theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.dataset.theme = stored;
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <IllustrativeBanner />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
