import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kathabox',
  description: 'Your child\'s Indian grandmother — stories, lullabies & memories in one cozy app',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ background: '#EDE8F0' }}>
        <div className="mx-auto max-w-[430px] min-h-screen relative bg-cream shadow-[0_0_60px_rgba(0,0,0,0.18)] overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
