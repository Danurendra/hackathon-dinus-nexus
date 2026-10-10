'use client';

import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/login') return <main>{children}</main>;
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-auto px-4 py-5 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[1480px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
