import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "科来教学平台", template: "%s · 科来教学平台" },
  description: "面向合作院校的岗位培养与实训平台",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
