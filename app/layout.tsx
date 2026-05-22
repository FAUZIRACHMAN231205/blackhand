import type { Metadata } from "next";
import { Cormorant_Garamond, Poppins } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "./component/ErrorBoundary";
import { ThemeProvider } from "./context/ThemeContext";

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

export const metadata: Metadata = {
  title: "BLACKHAND Art | Digital Identity",
  description: "Digital Identity System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Gabungkan variabel font di sini */}
      <body className={`${cormorant.variable} ${poppins.variable} antialiased bg-white dark:bg-slate-950 text-black dark:text-white transition-colors duration-300`}>
        <ErrorBoundary>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}