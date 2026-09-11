import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { RegisterSW } from "@/components/RegisterSW";
import { AutoFullscreen } from "@/components/AutoFullscreen";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SMVITM Student Council Election Portal",
  description: "Official E-Voting Platform of Shri Madhwa Vadiraja Institute of Technology & Management, Bantakal, Udupi",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SMVITM Voting",
  },
  icons: {
    icon: "/api/logo",
    apple: "/api/logo",
  },
};

export const viewport: Viewport = {
  themeColor: "#7B1436",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${outfit.variable} ${jakartaSans.variable} ${playfairDisplay.variable}`}>
      <body className="min-h-full flex flex-col bg-[#FAF7F2] text-[#122147] font-sans antialiased selection:bg-[#C59048]/20 selection:text-[#7B1436]">
        <div className="relative z-10 flex-grow flex flex-col">
          <Providers>{children}</Providers>
        </div>
        <RegisterSW />
        <AutoFullscreen />
      </body>
    </html>
  );
}
