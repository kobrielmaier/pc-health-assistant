import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PC Health Assistant API',
  description: 'Backend API for PC Health Assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
