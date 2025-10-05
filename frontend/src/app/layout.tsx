import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import type { Metadata } from 'next';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'HERMES',
  description: 'Heuristic Exoplanet Recognition and Model Evaluation System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}