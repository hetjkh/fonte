"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  MessageSquare,
  Users,
  Settings,
  Menu,
  X,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

const sidebarLinks = [
  {
    title: 'Overview',
    href: '/dashboard',
    icon: BarChart3
  },
  {
    title: 'Connection',
    href: '/dashboard/connection',
    icon: Smartphone
  },
  {
    title: 'Messaging',
    href: '/dashboard/messaging',
    icon: MessageSquare
  },
  {
    title: 'Create Campaign',
    href: '/dashboard/campaign',
    icon: Plus
  },
  {
    title: 'Templates',
    href: '/dashboard/templates',
    icon: Users
  }
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 rounded-md text-zinc-200 hover:bg-zinc-800"
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-black border-r border-zinc-800",
          // Desktop behavior - remove slow transitions
          "hidden lg:flex lg:flex-col",
          isSidebarOpen ? "lg:w-64" : "lg:w-16",
          // Mobile behavior - faster transitions
          "lg:translate-x-0 transition-transform duration-150 ease-out",
          isMobileMenuOpen ? "flex flex-col w-64 translate-x-0" : "lg:flex -translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo Section */}
          <div className={cn(
            "border-b border-zinc-800",
            isSidebarOpen ? "p-6" : "p-4"
          )}>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-zinc-200 flex-shrink-0" />
              {isSidebarOpen && (
                <span className="text-lg font-semibold text-zinc-200">
                  Dashboard
                </span>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-2">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              
              return (
                <div key={link.href} className="relative group">
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md relative transition-colors duration-75",
                      isSidebarOpen ? "px-3 py-2" : "px-3 py-3 justify-center",
                      isActive ? "bg-zinc-800 text-zinc-200" : "text-zinc-400",
                      "hover:bg-zinc-700 hover:text-zinc-100"
                    )}
                    // Add prefetch for faster navigation
                    prefetch={true}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {isSidebarOpen && (
                      <span className="whitespace-nowrap">
                        {link.title}
                      </span>
                    )}
                    
                    {/* Tooltip for collapsed sidebar */}
                    {!isSidebarOpen && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-zinc-200 text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
                        {link.title}
                      </div>
                    )}
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* Toggle Button - Desktop Only */}
          <div className="hidden lg:block p-4 border-t border-zinc-800">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={cn(
                "flex items-center gap-3 w-full rounded-md transition-colors duration-75",
                isSidebarOpen ? "px-3 py-2" : "px-3 py-3 justify-center",
                "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
              )}
            >
              {isSidebarOpen ? (
                <>
                  <ChevronLeft className="h-5 w-5 flex-shrink-0" />
                  <span>Collapse</span>
                </>
              ) : (
                <ChevronRight className="h-5 w-5 flex-shrink-0" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        // Remove slow transitions
        "transition-all duration-150 ease-out",
        // Desktop margins
        isSidebarOpen ? "lg:ml-64" : "lg:ml-16",
        // Mobile margins
        "ml-0",
        "p-8"
      )}>
        {children}
      </main>
    </div>
  );
}