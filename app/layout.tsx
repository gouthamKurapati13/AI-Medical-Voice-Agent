import { type Metadata } from 'next'
import {
  ClerkProvider,
} from '@clerk/nextjs'

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Provider from './provider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Medical Agent | College Project",
  description: "College project demonstrating an AI Medical voice agent with real-time conversation capabilities to provide healthcare information",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}>
          <Provider>
            {children}
          </Provider>
        </body>
      </html>
    </ClerkProvider>
  )
}