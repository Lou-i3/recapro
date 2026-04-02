import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from '../components/layout/Layout';

export const metadata: Metadata = {
  title: 'Statut Projet',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
