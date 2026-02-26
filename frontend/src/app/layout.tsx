export const metadata = {
  title: 'Haversack Unified Platform',
  description: 'CRM-first web application for Haversack Sales',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
