import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from '../components/layout/Layout';

export const metadata: Metadata = {
  title: {
    default: 'RécaPro',
    template: 'RécaPro | %s',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
