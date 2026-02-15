import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: {
    default: "Can it run OpenClaw? | Hardware Compatibility Directory",
    template: "%s | Can it run OpenClaw?",
  },
  description:
    "Find out if your hardware can run OpenClaw and its forks. Browse 90+ devices from $4 microcontrollers to cloud GPUs. Community-tested compatibility verdicts.",
  metadataBase: new URL("https://canitrunclaw.com"),
  openGraph: {
    type: "website",
    siteName: "Can it run OpenClaw?",
    title: "Can it run OpenClaw? | Hardware Compatibility Directory",
    description:
      "Find out if your hardware can run OpenClaw and its forks. Browse 90+ devices with community-tested compatibility verdicts.",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen bg-sand text-navy antialiased">
        <Nav />
        {children}
      </body>
    </html>
  );
}
