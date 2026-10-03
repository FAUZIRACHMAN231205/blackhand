import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Poppins } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import ErrorBoundary from "./component/ErrorBoundary";
import InstallPrompt from "./component/InstallPrompt";
import ServiceWorkerRegister from "./component/ServiceWorkerRegister";
import { THEME_INIT_SCRIPT } from "./lib/theme";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant", // Harus sama dengan di globals.css
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins", // Harus sama dengan di globals.css
});

const augustus = localFont({
  src: "./fonts/augustus.ttf",
  variable: "--font-augustus-custom",
  weight: "400",
  display: "swap",
  // Only artwork descriptions on detail pages use it; the browser fetches it
  // there on demand instead of every page preloading ~80 KB it never draws.
  preload: false,
});

export const metadata: Metadata = {
  title: "BLACKHAND Art | Digital Identity",
  description: "Digital Identity System",
  applicationName: "Blackhand",
  // Installed from Safari's "Add to Home Screen": open full-screen under this name.
  // "default" keeps dark status-bar text on a light bar — the site's default
  // light theme would hide white "black-translucent" text.
  appleWebApp: { capable: true, title: "Blackhand", statusBarStyle: "default" },
  // Stop iOS turning prices and order numbers into tappable phone links.
  formatDetection: { telephone: false },
};

// viewport-fit=cover exposes env(safe-area-inset-*) so fixed UI (navbar, drawer)
// can clear notches / home indicators on mobile.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The font variables must live on <html>: Tailwind resolves its theme
    // (--font-serif: var(--font-cormorant), …) on :root, and a variable that
    // only exists further down on <body> leaves every font-* utility invalid,
    // silently falling back to the system font.
    // suppressHydrationWarning: the theme script below adds `dark` and a
    // color-scheme to <html> before React hydrates, on purpose.
    <html
      lang="en"
      className={`${cormorant.variable} ${poppins.variable} ${augustus.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Must run before the first paint, or dark-mode visitors see a light flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased bg-white dark:bg-slate-950 text-black dark:text-white transition-colors duration-300">
        <ErrorBoundary>
          <ThemeProvider>
            <ToastProvider>
              {children}
              <InstallPrompt />
            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}