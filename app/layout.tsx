import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Outfit, Source_Serif_4 } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Synapse",
  description:
    "Knowledge base colaborativa, chat en tiempo real y RAG privado para tu equipo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#14110e",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${outfit.variable} ${fraunces.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ink font-sans text-paper">
        {children}
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: "#241f1a",
              border: "1px solid #3a3228",
              color: "#f3ede3",
            },
          }}
        />
      </body>
    </html>
  );
}
