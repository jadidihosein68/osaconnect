import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Send, AlertCircle, Inbox, Calendar, Bot } from 'lucide-react';
import { Button } from './ui/button';

interface DashboardProps {
  onNavigate: (screen: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const stats = [
    {
      title: 'Outbound Messages Today',
      value: '1,247',
      icon: Send,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Failed Messages',
      value: '23',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Inbound Captured',
      value: '342',
      icon: Inbox,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Upcoming Bookings',
      value: '18',
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const upcomingBookings = [
    { id: 1, contact: 'John Smith', service: 'Consultation', time: 'Today, 2:00 PM', status: 'confirmed' },
    { id: 2, contact: 'Sarah Johnson', service: 'Follow-up', time: 'Today, 3:30 PM', status: 'confirmed' },
    { id: 3, contact: 'Mike Brown', service: 'Initial Meeting', time: 'Tomorrow, 10:00 AM', status: 'confirmed' },
    { id: 4, contact: 'Emily Davis', service: 'Review', time: 'Tomorrow, 2:00 PM', status: 'pending' },
  ];

  const recentActivity = [
    { id: 1, type: 'outbound', message: 'WhatsApp campaign sent to 150 contacts', time: '10 mins ago', status: 'success' },
    { id: 2, type: 'inbound', message: 'New message from John Smith', time: '25 mins ago', status: 'new' },
    { id: 3, type: 'booking', message: 'Sarah Johnson confirmed booking', time: '1 hour ago', status: 'success' },
    { id: 4, type: 'failed', message: '5 messages failed to deliver', time: '2 hours ago', status: 'error' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
            <p className="text-gray-600">
              Get instant answers and automate tasks with your AI assistant.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => onNavigate('ai-assistant')} 
                className="w-full justify-start"
                variant="outline"
              >
                Ask a question
              </Button>
              <Button 
                onClick={() => onNavigate('ai-assistant')} 
                className="w-full justify-start"
                variant="outline"
              >
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
              <Button variant="ghost" size="sm" onClick={() => onNavigate('bookings')}>
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.status === 'success' ? 'bg-green-500' :
                  activity.status === 'error' ? 'bg-red-500' :
                  'bg-blue-500'
                }`} />
                <div className="flex-1">
                  <div className="text-gray-900">{activity.message}</div>
                  <div className="text-gray-500">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
