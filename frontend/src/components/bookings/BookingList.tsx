import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Plus, Eye, Calendar as CalendarIcon } from 'lucide-react';

interface BookingListProps {
  onViewBooking: (id: string) => void;
  onCreateBooking: () => void;
}

export function BookingList({ onViewBooking, onCreateBooking }: BookingListProps) {
  const bookings = [
    {
      id: '1',
      contact: 'John Smith',
      service: 'Consultation',
      date: 'Nov 18, 2024',
      time: '2:00 PM',
      status: 'confirmed',
      eventId: 'evt_abc123',
    },
    {
      id: '2',
      contact: 'Sarah Johnson',
      service: 'Follow-up',
      date: 'Nov 18, 2024',
      time: '3:30 PM',
      status: 'confirmed',
      eventId: 'evt_def456',
    },
    {
      id: '3',
      contact: 'Mike Brown',
      service: 'Initial Meeting',
      date: 'Nov 19, 2024',
      time: '10:00 AM',
      status: 'pending',
      eventId: 'evt_ghi789',
    },
    {
      id: '4',
      contact: 'Emily Davis',
      service: 'Review',
      date: 'Nov 19, 2024',
      time: '2:00 PM',
      status: 'confirmed',
      eventId: 'evt_jkl012',
    },
    {
      id: '5',
      contact: 'Robert Wilson',
      service: 'Consultation',
      date: 'Nov 20, 2024',
      time: '11:00 AM',
      status: 'rescheduled',
      eventId: 'evt_mno345',
    },
    {
      id: '6',
      contact: 'Lisa Anderson',
      service: 'Follow-up',
      date: 'Nov 21, 2024',
      time: '3:00 PM',
      status: 'cancelled',
      eventId: 'evt_pqr678',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-orange-500';
      case 'rescheduled':
        return 'bg-blue-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Bookings</h1>
          <p className="text-gray-600">Manage appointments and bookings</p>
        </div>
        <Button onClick={onCreateBooking}>
          <Plus className="w-4 h-4 mr-2" />
          Create Booking
        </Button>
      </div>

      {/* Calendar View (Simplified) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              November 2024
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Previous</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-gray-600 py-2">
                {day}
              </div>
            ))}
            {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
              <div
                key={day}
                className={`aspect-square border rounded-lg p-2 text-center ${
                  day === 18 ? 'bg-indigo-50 border-indigo-300' : 'bg-white'
                }`}
              >
                <div className="text-gray-900">{day}</div>
                {(day === 18 || day === 19) && (
                  <div className="w-1 h-1 bg-indigo-600 rounded-full mx-auto mt-1"></div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Bookings ({bookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-600">Contact</th>
                  <th className="text-left py-3 px-4 text-gray-600">Service</th>
                  <th className="text-left py-3 px-4 text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 text-gray-600">Time</th>
                  <th className="text-left py-3 px-4 text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-gray-600">Event ID</th>
                  <th className="text-left py-3 px-4 text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{booking.contact}</td>
                    <td className="py-3 px-4 text-gray-600">{booking.service}</td>
                    <td className="py-3 px-4 text-gray-600">{booking.date}</td>
                    <td className="py-3 px-4 text-gray-600">{booking.time}</td>
                    <td className="py-3 px-4">
                      <Badge className={`${getStatusColor(booking.status)} text-white capitalize`}>
                        {booking.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{booking.eventId}</td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewBooking(booking.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
