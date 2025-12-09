import {
  LayoutDashboard,
  Users,
  CreditCard,
  Send,
  Inbox,
  FileText,
  Bot,
  Calendar,
  Activity,
  Settings as SettingsIcon,
  LogOut,
  MessageSquare,
  BarChart3,
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useState } from 'react';
import { NotificationBell } from './notifications/NotificationBell';
import { ChevronDown } from 'lucide-react';

type SubMenuItem = { id: string; label: string; adminOnly?: boolean };
type MenuItem = { id: string; label: string; icon: any; submenu?: SubMenuItem[] };

interface LayoutProps {
  children: React.ReactNode;
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
  organizations?: { id: number; name: string }[];
  currentOrgId?: number | null;
  onOrgChange?: (orgId: number) => void;
  userName?: string;
  userEmail?: string;
  logoUrl?: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
}

function getInitials(name?: string) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Layout({ children, currentScreen, onNavigate, onLogout, organizations = [], currentOrgId, onOrgChange, userName, userEmail, logoUrl, avatarUrl, isAdmin }: LayoutProps) {
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({ contacts: true, settings: true });
  const [profileOpen, setProfileOpen] = useState(false);

  const isSubActive = (path: string, subId: string) => {
    if (subId === '/contacts/all-contacts') {
      return (
        path.startsWith('/contacts') &&
        !path.startsWith('/contacts/groups') &&
        !path.startsWith('/contacts/telegram-onboarding')
      );
    }
    return path === subId || path.startsWith(`${subId}`);
  };

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: Users,
      submenu: [
        { id: '/contacts/all-contacts', label: 'All Contacts' },
        { id: '/contacts/groups', label: 'Groups' },
        { id: '/contacts/telegram-onboarding', label: 'Telegram Onboarding' },
      ],
    },
    { 
      id: 'messaging', 
      label: 'Messaging', 
      icon: MessageSquare,
      submenu: [
        { id: '/messaging/send', label: 'Send Message' },
        { id: '/messaging/campaign', label: 'Campaigns' },
      ]
    },
    { id: '/inbound', label: 'Inbound Logs', icon: Inbox },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { 
      id: 'outbound-logs', 
      label: 'Outbound Logs', 
      icon: Send,
      submenu: [
        { id: '/outbound-logs/email', label: 'Email Logs' },
        // future: add WhatsApp/Telegram outbound here
      ],
    },
    { id: 'monitoring', label: 'Monitoring', icon: BarChart3 },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    {
      id: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
      submenu: [
        { id: '/settings/brandingandintegration', label: 'Branding & Integrations' },
        { id: '/settings/developers', label: 'Developers', adminOnly: true },
      ],
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              )}
            </div>
            <span className="text-xl text-gray-900">Corbi</span>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    if (item.submenu) {
                      setOpenSections((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                    } else {
                      onNavigate(item.id.startsWith('/') ? item.id : `/${item.id}`);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    currentScreen === item.id ||
                    currentScreen.startsWith(item.id) ||
                    currentScreen.startsWith(`/${item.id}`)
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
                {item.submenu && openSections[item.id] && (
                  <ul className="ml-8 mt-1 space-y-1">
                    {item.submenu
                      .filter((subitem) => !('adminOnly' in subitem) || (subitem as any).adminOnly !== true || isAdmin)
                      .map((subitem) => (
                        <li key={subitem.id}>
                          <button
                            onClick={() => onNavigate(subitem.id.startsWith('/') ? subitem.id : `/${subitem.id}`)}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                              isSubActive(currentScreen, subitem.id)
                                ? 'bg-indigo-50 text-indigo-600'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {subitem.label}
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-22-3 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <NotificationBell orgId={currentOrgId} onNavigate={onNavigate} />
            <div className="flex items-center gap-3">
              {organizations.length > 0 && (
                <select
                  className="border rounded px-3 py-1 text-sm"
                  value={currentOrgId ?? ''}
                  onChange={(e) => onOrgChange && onOrgChange(Number(e.target.value))}
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setProfileOpen((p) => !p)}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100"
              >
                <Avatar className="h-8 w-8">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                  )}
                </Avatar>
                <div className="text-sm text-gray-800 hidden sm:block text-left">
                  <div className="font-medium">{userName || 'User'}</div>
                  {userEmail && <div className="text-gray-500 text-xs">{userEmail}</div>}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow z-50">
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={() => {
                      setProfileOpen(false);
                      onNavigate('/profile');
                    }}
                  >
                    View Profile
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-red-600"
                    onClick={onLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
