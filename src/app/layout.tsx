import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import PWAProvider from "@/components/PWAProvider";
import AuthProvider from "@/components/AuthProvider";
import SyncManager from "@/components/SyncManager";

export const metadata: Metadata = {
  title: "CaféForms - Conecta tu Café con el Mundo",
  description: "Plataforma digital para caficultores colombianos. Registra tu finca, crea tu perfil y conecta con compradores internacionales de café de especialidad.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CaféForms",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <PWAProvider>
          <AuthProvider>
            <SyncManager />
            <div className="app-container">
              {children}
            </div>
            <BottomNav />
          </AuthProvider>
        </PWAProvider>
      </body>
    </html>
  );
}
