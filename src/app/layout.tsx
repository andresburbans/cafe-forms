import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import PWAProvider from "@/components/PWAProvider";

export const metadata: Metadata = {
  title: "CaféProy - Levantamiento de Fincas",
  description: "Formulario offline para levantamiento de fincas cafeteras. Marketplace de Café de Especialidad.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CaféProy",
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <PWAProvider>
          <div className="app-container">
            {children}
          </div>
          <BottomNav />
        </PWAProvider>
      </body>
    </html>
  );
}
