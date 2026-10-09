'use client';

import { useState } from 'react';
import { 
  Home, 
  MessageSquare, 
  FileText, 
  Users, 
  Building, 
  MapPin, 
  Settings, 
  Bell, 
  HelpCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

export function Sidebar() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    workers: true,
    analytics: false
  });

  const toggleItem = (key: string) => {
    setOpenItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const menuItems = [
    {
      icon: Home,
      label: 'Overview',
      href: '/'
    },
    {
      icon: MessageSquare,
      label: 'AI Assistant',
      href: '/assistant'
    },
    {
      icon: FileText,
      label: 'Tasks & History',
      href: '/tasks'
    },
    {
      icon: Bell,
      label: 'Approvals',
      href: '/approvals'
    },
    {
      icon: Users,
      label: 'Campus Workers',
      href: '#',
      children: [
        { label: 'Admissions Staff', href: '/workers/admissions' },
        { label: 'Finance Staff', href: '/workers/finance' },
        { label: 'Academic Admin', href: '/workers/academic' },
        { label: 'PDDikti Operator', href: '/workers/pddikti' },
        { label: 'IT Helpdesk', href: '/workers/it-helpdesk' },
        { label: 'Quality Assurance', href: '/workers/quality' },
        { label: 'Career Center', href: '/workers/career' },
        { label: 'Digital Archive', href: '/workers/archive' },
      ]
    },
    {
      icon: MapPin,
      label: 'Campus Twin',
      href: '/campus-twin'
    },
    {
      icon: Building,
      label: 'Knowledge Base',
      href: '/knowledge'
    },
    {
      icon: Settings,
      label: 'Analytics',
      href: '#',
      children: [
        { label: 'Token Usage', href: '/analytics/token' },
        { label: 'Task Metrics', href: '/analytics/tasks' },
        { label: 'System Health', href: '/analytics/system' },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-surface border-r border-border h-screen sticky top-0 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center space-x-2 mb-8">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">DN</span>
          </div>
          <h2 className="text-lg font-semibold text-textPrimary">DinusNexus</h2>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item, index) => (
            <div key={index}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleItem(`item-${index}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-textSecondary hover:bg-surfaceHover transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                    {openItems[`item-${index}`] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  
                  {openItems[`item-${index}`] && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.children.map((child, childIndex) => (
                        <a
                          key={childIndex}
                          href={child.href}
                          className="block px-3 py-2 rounded-lg text-sm text-textSecondary hover:bg-surfaceHover hover:text-textPrimary transition-colors"
                        >
                          {child.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <a
                  href={item.href}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-textSecondary hover:bg-surfaceHover hover:text-textPrimary transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </a>
              )}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}