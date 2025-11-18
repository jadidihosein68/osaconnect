import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Plus, Eye, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { fetchBookings, Booking } from '../../lib/api';
import { CreateBookingForm } from './CreateBookingForm';

interface BookingListProps {
  onViewBooking: (id: string) => void;
  onCreateBooking: () => void;
}

export function BookingList({ onViewBooking, onCreateBooking }: BookingListProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchBookings();
        setBookings(data);
      } catch {
        setError('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(
    () =>
      bookings.filter((b) => {
        const matchesStatus = statusFilter === 'all' ? true : b.status === statusFilter;
        const target = (b.contact?.full_name || '') + (b.title || '');
        const matchesSearch = target.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
      }).sort((a, b) => {
        const aDate = new Date(a.start_time).getTime();
        const bDate = new Date(b.start_time).getTime();
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      }),
    [bookings, search, statusFilter, sortOrder],
  );

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
      <CreateBookingForm onCreated={() => {
        // refresh list after creation
        setLoading(true);
        fetchBookings().then(setBookings).catch(() => setError('Failed to load bookings')).finally(() => setLoading(false));
      }} />

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
          <CardTitle>All Bookings ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          {loading ? (
            <p>Loading bookings...</p>
          ) : (
          <div className="overflow-x-auto">
            <div className="flex gap-4 mb-4">
              <Input
                placeholder="Search by contact or title"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Soonest first</SelectItem>
                  <SelectItem value="desc">Latest first</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                {filtered.map((booking) => (
                  <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{booking.contact?.full_name || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{booking.title}</td>
                    <td className="py-3 px-4 text-gray-600">{new Date(booking.start_time).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-gray-600">{new Date(booking.start_time).toLocaleTimeString()}</td>
                    <td className="py-3 px-4">
                      <Badge className={`${getStatusColor(booking.status)} text-white capitalize`}>
                        {booking.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{booking.external_calendar_id || '-'}</td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewBooking(String(booking.id))}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
