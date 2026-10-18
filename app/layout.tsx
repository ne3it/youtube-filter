import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ИИ-Анатомический фильтр YouTube",
  description: "Умное самообразование без инфомусора",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <body className="min-h-screen flex flex-col bg-background font-sans text-foreground antialiased">
        {/* Header placeholder */}
        <header className="w-full border-b border-card-border">
          <div className="mx-auto flex h-14 max-w-content items-center px-4 sm:px-6">
            <span className="text-lg font-bold tracking-tight text-brand-yellow">
              YT.ANATOMY
            </span>
          </div>
        </header>

        <main className="flex-grow">{children}</main>

        {/* Footer placeholder */}
        <footer className="w-full border-t border-card-border">
          <div className="mx-auto flex h-10 max-w-content items-center justify-center px-4 sm:px-6">
            <p className="text-xs text-muted">© 2026 YT.ANATOMY</p>
          </div>
        </footer>
      </body>
    </html>
  );
}