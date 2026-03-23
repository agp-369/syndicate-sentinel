import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider, UserButton } from '@clerk/nextjs'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Syndicate Sentinel | Sovereign Career OS",
  description: "Enterprise-grade career intelligence and forensic job auditing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <header className="fixed top-6 right-8 z-[100] flex gap-4 items-center">
            <div className="bg-white/80 backdrop-blur-xl border border-slate-100 p-1 rounded-full shadow-2xl flex items-center gap-3 pr-4">
              <UserButton />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sovereign Node</span>
            </div>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
