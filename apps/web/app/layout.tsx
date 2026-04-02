import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Matriz Nodes",
  description: "PoC de grafo empresarial com 5.000+ nós"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
