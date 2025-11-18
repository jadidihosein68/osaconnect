import { 
  LayoutDashboard, 
  Users, 
  Send, 
  Inbox, 
  FileText, 
  Bot, 
  Calendar, 
  Activity, 
  Settings as SettingsIcon,
  LogOut,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';

interface LayoutProps {
  children: React.ReactNode;
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
  organizations?: { id: number; name: string }[];
  currentOrgId?: number | null;
  onOrgChange?: (orgId: number) => void;
}

export function Layout({ children, currentScreen, onNavigate, onLogout, organizations = [], currentOrgId, onOrgChange }: LayoutProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { 
      id: 'messaging', 
      label: 'Messaging', 
      icon: MessageSquare,
      submenu: [
        { id: 'send-message', label: 'Send Message' },
        { id: 'campaign', label: 'Campaigns' },
      ]
    },
    { id: 'inbound-logs', label: 'Inbound Logs', icon: Inbox },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'outbound-logs', label: 'Outbound Logs', icon: Send },
    { id: 'monitoring', label: 'Monitoring', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
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
            </div>
            <span className="text-xl text-gray-900">Corbi</span>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    currentScreen === item.id || currentScreen.startsWith(item.id)
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
                {item.submenu && (
                  <ul className="ml-8 mt-1 space-y-1">
                    {item.submenu.map((subitem) => (
                      <li key={subitem.id}>
                        <button
                          onClick={() => onNavigate(subitem.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                            currentScreen === subitem.id
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
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
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
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-5 h-5" />
            </Button>
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
