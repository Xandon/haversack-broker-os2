import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Haversack Unified Platform',
  description: 'CRM-first web application for Haversack Sales',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
