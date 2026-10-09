'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navigationItems } from '@/config/navigation';

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-900 text-slate-300 md:block">
      <div className="p-4">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold text-white">DN</span>
          <span className="text-lg font-semibold text-white">DinusNexus</span>
        </Link>

        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Workspace</p>
        <nav aria-label="Primary navigation" className="space-y-1">
          {navigationItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-500/15 text-indigo-200'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-indigo-300' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
          <p className="text-xs font-medium text-white">Unified workspace</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Use cases tersedia dipilih saat membuat task, bukan sebagai aplikasi terpisah.
          </p>
        </div>
      </div>
    </aside>
  );
}
