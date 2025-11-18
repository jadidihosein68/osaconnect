import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchMonitoringSummary, fetchOutbound } from '../../lib/api';

export function MonitoringDashboard() {
  const [summary, setSummary] = useState<{ totals: Record<string, number>; success_rate: number; average_response_ms: number | null } | null>(null);
  const [outbound, setOutbound] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [m, o] = await Promise.all([fetchMonitoringSummary(), fetchOutbound()]);
        setSummary(m);
        setOutbound(o);
      } catch {
        setError('Failed to load monitoring data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const samples = useMemo(() => {
    // Fake time series from outbound created_at grouped by date
    const grouped: Record<string, number> = {};
    outbound.forEach((o) => {
      const d = new Date(o.created_at).toLocaleDateString();
      grouped[d] = (grouped[d] || 0) + 1;
    });
    return Object.entries(grouped).map(([date, messages]) => ({ date, messages }));
  }, [outbound]);

  const successRate = summary ? `${summary.success_rate.toFixed(1)}%` : '—';
  const failedMessages = summary?.totals?.failed_today ?? '—';
  const totalToday = summary?.totals?.outbound_today ?? '—';
  const avgResponseTime = summary?.average_response_ms ? `${summary.average_response_ms} ms` : '—';

  const failureReasons = outbound
    .filter((o) => o.status === 'failed' && o.error)
    .map((o) => o.error || 'Unknown')
    .reduce((acc: Record<string, number>, err) => {
      acc[err] = (acc[err] || 0) + 1;
      return acc;
    }, {});
  const failureData = Object.entries(failureReasons).map(([reason, count]) => ({ reason, count }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Monitoring Dashboard</h1>
        <p className="text-gray-600">Track message delivery and performance metrics</p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {loading && <p className="text-gray-600 text-sm">Loading...</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-gray-600 mb-1">Total Today</div>
            <div className="text-gray-900 text-xl">{totalToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-gray-600 mb-1">Success Rate</div>
            <div className="text-gray-900 text-xl">{successRate}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-gray-600 mb-1">Failed Messages</div>
            <div className="text-gray-900 text-xl">{failedMessages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-gray-600 mb-1">Avg Response Time</div>
            <div className="text-gray-900 text-xl">{avgResponseTime}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Outbound Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={samples}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="messages" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Failure Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={failureData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="reason" angle={-30} textAnchor="end" height={80} interval={0} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
