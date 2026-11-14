import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Poppins } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "./component/ErrorBoundary";
import InstallPrompt from "./component/InstallPrompt";
import ServiceWorkerRegister from "./component/ServiceWorkerRegister";
import { THEME_COLORS, THEME_INIT_SCRIPT } from "./lib/theme";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";

// Cormorant for artwork names and the wordmark (italic), Poppins for
// everything else (docs/DESIGN.md → Type). Augustus is used only by the app
// icon (app/lib/brandIcon.tsx), which reads the font file itself.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant", // Same name as in globals.css
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins", // Same name as in globals.css
});

export const metadata: Metadata = {
  title: {
    default: "Blackhand — Karya seni & merchandise",
    template: "%s · Blackhand",
  },
  description:
    "Karya seni eksklusif dari studio Blackhand — setiap karya hanya untuk satu pemilik — dan merchandise resmi.",
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
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
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
      lang="id"
      className={`${cormorant.variable} ${poppins.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Must run before the first paint, or dark-mode visitors see a light flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-paper font-sans text-ink antialiased">
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