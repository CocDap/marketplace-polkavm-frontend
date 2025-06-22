import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from '@/app/providers';
import SigpassKit from "@/components/sigpasskit";
import Link from "next/link";
import Image from "next/image";

const unbounded = Unbounded({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Marketplace NFT on PolkaVM",
  description: "a Marketplace NFT on PolkaVM who love DOT",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={unbounded.className}
      >
        <Providers>
          <header className="flex justify-between items-center px-4 py-2 border-b sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Link href="/" className="flex items-center gap-4 font-bold text-xl">
              <Image
                src="/og-logo.png"
                alt="OpenGuild logo"
                width={120}
                height={25}
                priority
              />
              <span className="hidden sm:inline-block font-semibold text-primary">Marketplace NFT on PolkaVM</span>
            </Link>
            <div className="flex items-center gap-4">
              <SigpassKit />
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
