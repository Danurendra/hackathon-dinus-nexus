'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, User, Bell, ChevronRight } from 'lucide-react';
import { navigationItems } from '@/config/navigation';
import { readDemoKey } from '@/lib/demoSession';
import { readUserToken } from '@/lib/userSession';
import { loadAccount, logoutAccount, type AccountUser } from '@/lib/login';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [demoSession, setDemoSession] = useState(false);
  const [account, setAccount] = useState<AccountUser | null>(null);
  const [sessionError, setSessionError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    setDemoSession(Boolean(readDemoKey()));
    if (!readUserToken()) { setAccount(null); return; }
    const controller = new AbortController();
    void loadAccount(controller.signal).then((user) => {
      if (controller.signal.aborted) return;
      setAccount(user);
      if (!user) router.replace('/login');
    }).catch(() => { if (!controller.signal.aborted) setSessionError('Sesi belum dapat diverifikasi.'); });
    return () => controller.abort();
  }, [pathname, router]);

  async function logout() {
    setLoggingOut(true); setSessionError('');
    try { await logoutAccount(); setAccount(null); setDemoSession(false); router.push('/login'); }
    catch (reason) { setSessionError(reason instanceof Error ? reason.message : 'Logout gagal.'); }
    finally { setLoggingOut(false); }
  }
  const activeItem = navigationItems.find((item) => item.href === pathname || (item.href !== '/' && pathname.startsWith(item.href)));

  return (
    <header className="flex h-16 items-center border-b border-border bg-surface px-4 md:px-8">
      <div className="flex items-center justify-between w-full">
        {/* Logo */}
        <div className="flex items-center gap-2 text-sm text-textSecondary">
          <span className="font-medium text-textPrimary">Workspace</span>
          <ChevronRight className="h-4 w-4" />
          <span>{activeItem?.label ?? 'Command Center'}</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">Workspace demo · SYNTHETIC</span>
        </nav>

        {/* Right side icons */}
        <div className="flex items-center space-x-4">
          <button aria-label="Notifications" className="rounded-lg p-2 transition-colors hover:bg-surfaceHover">
            <Bell className="w-5 h-5 text-textSecondary" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            {account && <span className="hidden max-w-32 truncate text-sm text-textSecondary md:block">{account.display_name}</span>}
            {account || demoSession || sessionError ? <button disabled={loggingOut} className="rounded-lg px-2 py-2 text-sm text-textSecondary hover:bg-surfaceHover" onClick={() => void logout()}>{loggingOut ? 'Keluar...' : account || readUserToken() ? 'Keluar' : 'Keluar demo'}</button> : <Link href="/login" className="rounded-lg px-2 py-2 text-sm text-textSecondary hover:bg-surfaceHover">Masuk</Link>}
            {sessionError && <span role="alert" className="max-w-48 text-xs text-red-700">{sessionError}</span>}
          </div>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-surfaceHover transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5 text-textPrimary" /> : <Menu className="w-5 h-5 text-textPrimary" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="absolute left-0 right-0 top-16 z-20 border-b border-border bg-surface p-3 shadow-lg md:hidden">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm ${
                  item.href === pathname ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-textSecondary hover:bg-surfaceHover hover:text-textPrimary'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
