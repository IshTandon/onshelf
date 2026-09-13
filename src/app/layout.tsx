import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { SimulationProvider } from "@/hooks/useSimulation";
import { Nav } from "@/components/Nav";
import { ToastContainer } from "@/components/Toast";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-sans",
});

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "OnShelf",
  description: "Shelf gap task list for store managers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="font-sans">
        <SimulationProvider>
          <main className="min-h-screen pb-16 [&:has(.regional-layout)]:pb-0">
            {children}
          </main>
          <Nav />
          <ToastContainer />
        </SimulationProvider>
      </body>
    </html>
  );
}
