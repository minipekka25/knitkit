import type { ReactNode } from "react";

export const metadata = { title: "knitkit + Next.js App Router" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "0 auto", padding: 24 }}>
        {children}
      </body>
    </html>
  );
}
