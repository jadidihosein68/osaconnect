import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Send, AlertCircle, Inbox, Calendar, Bot, Megaphone, Mail, Bell } from 'lucide-react';
import { Button } from './ui/button';
import { fetchDashboard } from '../lib/api';

interface DashboardProps {
  onNavigate: (screen: string) => void;
  orgId?: number | null;
  isLoggedIn?: boolean;
}

export function Dashboard({ onNavigate, orgId, isLoggedIn }: DashboardProps) {
  const [stats, setStats] = useState<any[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !orgId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { metrics, outbound, inbound, bookings } = await fetchDashboard();
        setStats([
          {
            title: 'Outbound Messages',
            value: metrics.outbound,
            icon: Send,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
            tooltip: 'Total outbound messages sent (all channels, org-scoped).',
          },
          {
            title: 'Failed Messages',
            value: metrics.failed,
            icon: AlertCircle,
            color: 'text-red-600',
            bgColor: 'bg-red-100',
            tooltip: 'Outbound messages with a failed status.',
          },
          {
            title: 'Inbound Captured',
            value: metrics.inbound,
            icon: Inbox,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
            tooltip: 'Inbound messages logged for diagnostics.',
          },
          {
            title: 'Bookings',
            value: metrics.bookings,
            icon: Calendar,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100',
            tooltip: 'Total bookings in this organization.',
          },
          {
            title: 'Campaigns',
            value: metrics.campaigns ?? 0,
            icon: Megaphone,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-100',
            tooltip: 'Total campaigns created (all channels).',
          },
          {
            title: 'Email Recipients',
            value: metrics.email_jobs_recipients ?? 0,
            icon: Mail,
            color: 'text-amber-600',
            bgColor: 'bg-amber-100',
            tooltip: 'Total email recipients across jobs/campaigns.',
          },
          {
            title: 'Email Delivered',
            value: metrics.email_jobs_delivered ?? 0,
            icon: Mail,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
            tooltip: 'Email recipients marked delivered/read.',
          },
          {
            title: 'Alerts Open',
            value: metrics.alerts_open ?? 0,
            icon: Bell,
            color: 'text-rose-600',
            bgColor: 'bg-rose-100',
            tooltip: 'Open monitoring alerts (not acknowledged).',
          },
        ]);
        setUpcomingBookings(bookings.slice(0, 4).map((b: any) => ({
          id: b.id,
          contact: b.contact?.full_name || 'Unknown',
          service: b.title,
          time: new Date(b.start_time).toLocaleString(),
          status: b.status,
        })));
        setRecentActivity([
          ...outbound.slice(0, 2).map((o: any) => ({ id: `out-${o.id}`, type: 'outbound', message: (o.body || '').slice(0, 80), time: new Date(o.created_at).toLocaleTimeString(), status: o.status === 'failed' ? 'error' : 'success' })),
          ...inbound.slice(0, 2).map((i: any) => ({ id: `in-${i.id}`, type: 'inbound', message: String(i.payload?.text || i.payload?.message || ''), time: new Date(i.received_at).toLocaleTimeString(), status: 'new' })),
        ]);
      } catch {
        setError('Failed to load dashboard data. Ensure you are logged in and an organization is selected.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isLoggedIn, orgId]);

  const showGuard = !isLoggedIn || !orgId;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {showGuard && <p className="text-amber-600 text-sm">Login and select an organization to load data.</p>}
      </div>

      {loading ? (
        <p>Loading dashboard...</p>
      ) : showGuard ? null : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 mb-1" title={stat.tooltip || ''}>{stat.title}</p>
                    <p className="text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} title={stat.tooltip || ''} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!showGuard && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Assistant Quick Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-600" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">Get instant answers and automate tasks with your AI assistant.</p>
            <div className="space-y-2">
              <Button onClick={() => onNavigate('/assistant')} className="w-full justify-start" variant="outline">
                Ask a question
              </Button>
              <Button onClick={() => onNavigate('/assistant')} className="w-full justify-start" variant="outline">
                Browse knowledge base
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Upcoming Bookings
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('/bookings')}>
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-gray-900">{booking.contact}</div>
                    <div className="text-gray-600">{booking.service}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-900">{booking.time}</div>
                    <div className={`inline-block px-2 py-1 rounded text-white ${
                      booking.status === 'confirmed' ? 'bg-green-500' : 'bg-orange-500'
                    }`}>
                      {booking.status}
                    </div>
                  </div>
                </div>
              ))}
              {upcomingBookings.length === 0 && <div className="text-gray-600 text-sm">No upcoming bookings</div>}
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4">
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'error' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`}
                />
                <div className="flex-1">
                  <div className="text-gray-900">{activity.message || 'No message'}</div>
                  <div className="text-gray-500">{activity.time}</div>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && <div className="text-gray-600 text-sm">No recent activity</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
