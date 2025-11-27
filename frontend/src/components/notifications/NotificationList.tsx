import { useEffect, useState } from 'react';
import {
  fetchNotifications,
  fetchNotificationSummary,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationRecipient,
} from '../../lib/api';
import { Button } from '../ui/button';

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

export function NotificationList() {
  const [items, setItems] = useState<NotificationRecipient[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [list, summary] = await Promise.all([
        fetchNotifications({ page: 1, page_size: 50 }),
        fetchNotificationSummary(),
      ]);
      setItems(list.results || []);
      setUnread(summary.unread_count || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleRead = async (id: number, read: boolean) => {
    await markNotificationRead(id, read);
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, read_at: read ? new Date().toISOString() : null } : p)));
    setUnread((count) => Math.max(0, count + (read ? -1 : 1)));
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((p) => ({ ...p, read_at: p.read_at || new Date().toISOString() })));
    setUnread(0);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-600">Org-scoped notifications for your account.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-700">Unread: {unread}</span>
          <Button variant="outline" size="sm" onClick={handleMarkAll}>
            Mark all read
          </Button>
          <Button variant="ghost" size="sm" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>
      <div className="bg-white shadow-sm border rounded-lg divide-y">
        {loading && <div className="p-4 text-sm text-gray-500">Loading...</div>}
        {!loading && items.length === 0 && <div className="p-4 text-sm text-gray-500">No notifications.</div>}
        {!loading &&
          items.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex justify-between items-start ${item.read_at ? 'bg-white' : 'bg-indigo-50'}`}
            >
              <div>
                <div className="flex gap-2 items-center">
                  <span className={`font-semibold ${item.read_at ? 'text-gray-900' : 'text-indigo-800'}`}>
                    {item.notification.title}
                  </span>
                  <span className="text-xs text-gray-500">{timeAgo(item.notification.created_at)}</span>
                </div>
                {item.notification.body && <div className="text-sm text-gray-700 mt-1">{item.notification.body}</div>}
                <div className="mt-2 flex gap-2 text-xs text-gray-600">
                  <span className="px-2 py-0.5 bg-gray-100 rounded">{item.notification.type}</span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded">{item.notification.severity}</span>
                </div>
                {item.notification.target_url && (
                  <div className="text-xs text-indigo-600 mt-2 break-all">{item.notification.target_url}</div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => toggleRead(item.id, !item.read_at)}>
                  {item.read_at ? 'Mark unread' : 'Mark read'}
                </Button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
