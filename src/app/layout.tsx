import type { Metadata } from "next";
import { Merriweather, Inter } from "next/font/google"; // Updated fonts
import "./globals.css";

const merriweather = Merriweather({
  variable: "--font-display", // Update variable name
  weight: ["300", "400", "700"],
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",     // Update variable name
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shokupan Dough Calculator", // Updated title
  description: "A minimalist calculator for your perfect loaf.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${merriweather.variable} ${inter.variable} antialiased bg-background-light dark:bg-background-dark text-gray-800 dark:text-gray-200 transition-colors duration-200`} // Add base classes
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
