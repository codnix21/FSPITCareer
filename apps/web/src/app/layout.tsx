import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FSP IT Career — подбор IT-специалистов',
  description:
    'Платформа обратного подбора IT-специалистов с подтверждёнными достижениями Федерации спортивного программирования.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
