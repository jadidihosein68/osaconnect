import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, Clock } from 'lucide-react';
import { fetchMonitoringSummary, fetchOutbound, fetchMonitoringDetails, fetchMonitoringEvents, fetchMonitoringAlerts } from '../../lib/api';

export function MonitoringDashboard() {
  const [summary, setSummary] = useState<{
    totals: Record<string, number>;
    success_rate: number;
    average_response_ms: number | null;
  } | null>(null);
  const [details, setDetails] = useState<{
    per_channel: Record<string, { total: number; delivered: number; failed: number; success_rate: number }>;
    summary: {
      outbound: number;
      inbound: number;
      callback_errors: number;
      booking_failures: number;
      ai_failures: number;
      avg_callback_latency_ms: number;
      p50_latency_ms?: number;
      p95_latency_ms?: number;
      p99_latency_ms?: number;
      campaigns_today?: number;
      alerts_today?: number;
    };
    failure_reasons: Record<string, number>;
  } | null>(null);
  const [outbound, setOutbound] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [range, setRange] = useState<'today' | '7d' | '30d'>('today');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [m, o, d, ev, al] = await Promise.all([
          fetchMonitoringSummary(range),
          fetchOutbound(),
          fetchMonitoringDetails(range),
          fetchMonitoringEvents(50),
          fetchMonitoringAlerts(20),
        ]);
        setSummary(m);
        setOutbound(o);
        setDetails(d);
        setEvents(ev);
        setAlerts(al);
      } catch {
        setError('Failed to load monitoring data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [range]);

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
  const failedTotal = summary?.totals?.failed_total ?? summary?.totals?.failed_today ?? '—';
  const outboundTotal = summary?.totals?.outbound_total ?? summary?.totals?.outbound_today ?? '—';
  const inboundTotal = summary?.totals?.inbound_total ?? summary?.totals?.inbound_today ?? '—';
  const avgResponseTime = summary?.average_response_ms ? `${summary.average_response_ms} ms` : '—';

  const failureData = details
    ? Object.entries(details.failure_reasons).map(([reason, count]) => ({ reason, count }))
    : [];

  const extraStats = details?.summary || {
    outbound: 0,
    inbound: 0,
    callback_errors: 0,
    booking_failures: 0,
    ai_failures: 0,
    avg_callback_latency_ms: 0,
    p50_latency_ms: 0,
    p95_latency_ms: 0,
    p99_latency_ms: 0,
    campaigns_today: 0,
    alerts_today: 0,
  };
  const perChannel = details?.per_channel || {};

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Monitoring Dashboard</h1>
        <p className="text-gray-600">Track message delivery and performance metrics</p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {loading && <p className="text-gray-600 text-sm">Loading...</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Range:</span>
          <div className="flex gap-2">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: 'Last 7d' },
              { id: '30d', label: 'Last 30d' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setRange(opt.id as any)}
                className={`px-3 py-1 rounded-full border text-sm ${
                  range === opt.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-gray-600 mb-1">Outbound (total)</div>
            <div className="text-gray-900 text-xl">{outboundTotal}</div>
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
            <div className="text-gray-900 text-xl">{failedTotal}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-gray-600 mb-1">Inbound (total)</div>
            <div className="text-gray-900 text-xl">{inboundTotal}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-gray-600 mb-1">Avg Callback Latency</div>
            <div className="text-gray-900 text-xl">{avgResponseTime}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-gray-600 mb-1">Callback Errors</div>
            <div className="text-gray-900 text-xl">{extraStats.callback_errors ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-gray-600 mb-1">Booking Failures</div>
            <div className="text-gray-900 text-xl">{extraStats.booking_failures ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Clock className="w-4 h-4" />
              <span title="95th percentile callback latency for the selected range.">Latency p95</span>
            </div>
            <div className="text-gray-900 text-xl">
              {typeof extraStats.p95_latency_ms === 'number' && extraStats.p95_latency_ms > 0
                ? `${extraStats.p95_latency_ms.toFixed(0)} ms`
                : 'No data'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Clock className="w-4 h-4" />
              <span title="99th percentile callback latency for the selected range.">Latency p99</span>
            </div>
            <div className="text-gray-900 text-xl">
              {typeof extraStats.p99_latency_ms === 'number' && extraStats.p99_latency_ms > 0
                ? `${extraStats.p99_latency_ms.toFixed(0)} ms`
                : 'No data'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-Channel Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-600">
                  <th className="py-2">Channel</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Delivered</th>
                  <th className="py-2">Failed</th>
                  <th className="py-2">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(perChannel).map(([channel, stats]) => (
                  <tr key={channel} className="border-t">
                    <td className="py-2 capitalize">{channel}</td>
                    <td className="py-2">{stats.total}</td>
                    <td className="py-2">{stats.delivered}</td>
                    <td className="py-2">{stats.failed}</td>
                    <td className="py-2">{stats.success_rate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Provider Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {events.map((event) => (
                <div key={event.id} className="p-3 border rounded-lg">
                  <div className="text-sm text-gray-500">{new Date(event.received_at).toLocaleString()}</div>
                  <div className="text-gray-900 text-sm font-medium capitalize">{event.channel}</div>
                  <div className="text-gray-700 text-sm">Status: {event.status}</div>
                  <div className="text-gray-700 text-sm">Latency: {event.latency_ms} ms</div>
                </div>
              ))}
              {events.length === 0 && <p className="text-gray-500 text-sm">No events yet.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-3 border rounded-lg">
                  <div className="text-sm text-gray-500">{new Date(alert.created_at).toLocaleString()}</div>
                  <div className="text-gray-900 text-sm font-semibold">
                    {alert.severity.toUpperCase()} - {alert.category}
                  </div>
                  <div className="text-gray-700 text-sm">{alert.message}</div>
                </div>
              ))}
              {alerts.length === 0 && <p className="text-gray-500 text-sm">No alerts.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
