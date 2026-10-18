import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouTube Concept Filter | AI Anatomical Analysis",
  description: "Ультра-минималистичный ИИ-анализ концепций YouTube видео.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="h-full">
      <body className="min-h-full bg-paper font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}