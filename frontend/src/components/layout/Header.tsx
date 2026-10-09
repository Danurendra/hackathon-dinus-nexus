'use client';

import { useState } from 'react';
import { Menu, X, User, Bell, Settings } from 'lucide-react';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-surface border-b border-border h-16 flex items-center px-4 md:px-6">
      <div className="flex items-center justify-between w-full">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">DN</span>
          </div>
          <h1 className="text-xl font-bold text-textPrimary">DinusNexus</h1>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <a href="#" className="text-textSecondary hover:text-textPrimary transition-colors">Dashboard</a>
          <a href="#" className="text-textSecondary hover:text-textPrimary transition-colors">Tasks</a>
          <a href="#" className="text-textSecondary hover:text-textPrimary transition-colors">Workers</a>
          <a href="#" className="text-textSecondary hover:text-textPrimary transition-colors">Campus Twin</a>
          <a href="#" className="text-textSecondary hover:text-textPrimary transition-colors">Analytics</a>
        </nav>

        {/* Right side icons */}
        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-lg hover:bg-surfaceHover transition-colors">
            <Bell className="w-5 h-5 text-textSecondary" />
          </button>
          <button className="p-2 rounded-lg hover:bg-surfaceHover transition-colors">
            <Settings className="w-5 h-5 text-textSecondary" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="hidden md:block text-sm text-textSecondary">Admin</span>
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
        <div className="md:hidden mt-4 py-4 border-t border-border">
          <nav className="flex flex-col space-y-2">
            <a href="#" className="px-4 py-2 text-textSecondary hover:text-textPrimary transition-colors">Dashboard</a>
            <a href="#" className="px-4 py-2 text-textSecondary hover:text-textPrimary transition-colors">Tasks</a>
            <a href="#" className="px-4 py-2 text-textSecondary hover:text-textPrimary transition-colors">Workers</a>
            <a href="#" className="px-4 py-2 text-textSecondary hover:text-textPrimary transition-colors">Campus Twin</a>
            <a href="#" className="px-4 py-2 text-textSecondary hover:text-textPrimary transition-colors">Analytics</a>
          </nav>
        </div>
      )}
    </header>
  );
}