import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Haversack Unified Platform',
  description: 'CRM for Haversack Sales — specialty food broker/wholesaler',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
