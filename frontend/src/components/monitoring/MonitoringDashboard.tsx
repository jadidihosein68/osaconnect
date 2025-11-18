import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function MonitoringDashboard() {
  const volumeData = [
    { date: 'Nov 12', messages: 1200 },
    { date: 'Nov 13', messages: 950 },
    { date: 'Nov 14', messages: 1450 },
    { date: 'Nov 15', messages: 1100 },
    { date: 'Nov 16', messages: 1600 },
    { date: 'Nov 17', messages: 1350 },
    { date: 'Nov 18', messages: 1247 },
  ];

  const statusData = [
    { name: 'Delivered', value: 1180, color: '#22c55e' },
    { name: 'Sent', value: 44, color: '#3b82f6' },
    { name: 'Failed', value: 23, color: '#ef4444' },
  ];

  const failureReasons = [
    { reason: 'Network Timeout', count: 8 },
    { reason: 'Invalid Number', count: 6 },
    { reason: 'Rate Limit', count: 5 },
    { reason: 'Account Suspended', count: 3 },
    { reason: 'Other', count: 1 },
  ];

  const recentFailures = [
    { id: 1, contact: 'Mike Brown', channel: 'WhatsApp', reason: 'Network Timeout', time: '1 hour ago' },
    { id: 2, contact: 'Lisa Anderson', channel: 'Email', reason: 'Invalid Email', time: '2 hours ago' },
    { id: 3, contact: 'Unknown', channel: 'Telegram', reason: 'Account Suspended', time: '3 hours ago' },
    { id: 4, contact: 'David Lee', channel: 'WhatsApp', reason: 'Rate Limit', time: '4 hours ago' },
  ];

  const stats = [
    { label: 'Total Today', value: '1,247', change: '+12%', color: 'text-blue-600' },
    { label: 'Success Rate', value: '98.2%', change: '+0.5%', color: 'text-green-600' },
    { label: 'Failed Messages', value: '23', change: '-5%', color: 'text-red-600' },
    { label: 'Avg Response Time', value: '2.3s', change: '-0.2s', color: 'text-purple-600' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Monitoring Dashboard</h1>
        <p className="text-gray-600">Track message delivery and performance metrics</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="text-gray-600 mb-1">{stat.label}</div>
              <div className="flex items-end justify-between">
                <div className={`text-gray-900 ${stat.color}`}>{stat.value}</div>
                <div className={`${stat.change.startsWith('+') ? 'text-green-600' : stat.change.startsWith('-') && stat.label.includes('Failed') ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outbound Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Outbound Volume (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="messages" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Delivery Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Status (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failure Reasons Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Failure Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={failureReasons}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="reason" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Failures Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Failures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentFailures.map((failure) => (
                <div key={failure.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex-1">
                    <div className="text-gray-900">{failure.contact}</div>
                    <div className="text-gray-600">
                      {failure.channel} • {failure.reason}
                    </div>
                  </div>
                  <div className="text-gray-500">{failure.time}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { channel: 'WhatsApp', sent: 650, delivered: 645, failed: 5, rate: 99.2 },
              { channel: 'Email', sent: 420, delivered: 410, failed: 10, rate: 97.6 },
              { channel: 'Telegram', sent: 120, delivered: 115, failed: 5, rate: 95.8 },
              { channel: 'Instagram', sent: 57, delivered: 54, failed: 3, rate: 94.7 },
            ].map((channel) => (
              <div key={channel.channel} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-gray-900">{channel.channel}</div>
                  <div className="text-gray-600">Success Rate: {channel.rate}%</div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-green-500 h-full"
                      style={{ width: `${(channel.delivered / channel.sent) * 100}%` }}
                    />
                  </div>
                  <div className="text-gray-600 min-w-[100px] text-right">
                    {channel.delivered}/{channel.sent}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
