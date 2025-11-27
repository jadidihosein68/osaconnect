import { Bell } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import {
  fetchNotificationSummary,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationRecipient,
} from '../../lib/api';
import { Button } from '../ui/button';

interface Props {
  orgId?: number | null;
  onNavigate: (path: string) => void;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({ orgId, onNavigate }: Props) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationRecipient[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const summary = await fetchNotificationSummary();
        setUnreadCount(summary.unread_count || 0);
      } catch {
        // ignore
      }
    };
    if (orgId) load();
  }, [orgId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (open && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications({ page: 1, page_size: 20 });
      setItems(data.results || []);
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) await loadItems();
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setItems((prev) => prev.map((p) => ({ ...p, read_at: p.read_at || new Date().toISOString() })));
  };

  const handleClickItem = async (item: NotificationRecipient) => {
    if (!item.read_at) {
      await markNotificationRead(item.id, true);
      setUnreadCount((c) => Math.max(0, c - 1));
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, read_at: new Date().toISOString() } : p)),
      );
    }
    const target = item.notification.target_url;
    if (target) {
      onNavigate(target);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggle}
        className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[11px] px-1.5 py-0.5 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-semibold text-gray-800">Notifications</div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-sm text-indigo-600"
                onClick={() => {
                  setOpen(false);
                  onNavigate('/notifications');
                }}
              >
                View all
              </Button>
              <Button variant="ghost" size="sm" className="text-sm text-gray-600" onClick={handleMarkAll}>
                Mark all read
              </Button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>}
            {!loading && items.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-500">No notifications</div>
            )}
            {!loading &&
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleClickItem(item)}
                  className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition ${
                    item.read_at ? 'bg-white' : 'bg-indigo-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className={`font-semibold ${item.read_at ? 'text-gray-900' : 'text-indigo-700'}`}>
                      {item.notification.title}
                    </div>
                    <span className="text-xs text-gray-500">{timeAgo(item.notification.created_at)}</span>
                  </div>
                  {item.notification.body && (
                    <div className="text-sm text-gray-600 line-clamp-2">{item.notification.body}</div>
                  )}
                  <div className="mt-1 text-xs text-gray-500 flex gap-2">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      {item.notification.type}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      {item.notification.severity}
                    </span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
