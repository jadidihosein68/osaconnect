import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Plus, Eye, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { fetchBookings, fetchResources, Booking, Resource } from '../../lib/api';
import { BookingCalendar } from './BookingCalendar';

interface BookingListProps {
  onViewBooking: (id: string) => void;
  onCreateBooking: () => void;
}

export function BookingList({ onViewBooking, onCreateBooking }: BookingListProps) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceFilter, setResourceFilter] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [data, resData] = await Promise.all([fetchBookings(), fetchResources()]);
        setBookings(data);
        setResources(resData);
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
      bookings
        .filter((b) => {
          const matchesStatus = statusFilter === 'all' ? true : b.status === statusFilter;
          const target = (b.title || '') + (b.organizer_email || '') + (b.meeting_type || '');
          const matchesSearch = target.toLowerCase().includes(search.toLowerCase());
          const matchesResource = resourceFilter === 'all' ? true : b.resource?.id === Number(resourceFilter);
          return matchesStatus && matchesSearch && matchesResource;
        })
        .sort((a, b) => {
          const aDate = new Date(a.start_time).getTime();
          const bDate = new Date(b.start_time).getTime();
          return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
        }),
    [bookings, search, statusFilter, sortOrder, resourceFilter],
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
      {/* Calendar View */}
      <BookingCalendar
        bookings={resourceFilter === 'all' ? bookings : filtered}
        onCreateForDate={(iso, endIso) => {
          sessionStorage.setItem('booking_prefill_start', iso);
          if (endIso) sessionStorage.setItem('booking_prefill_end', endIso);
          const params = new URLSearchParams();
          params.set('start', iso);
          if (endIso) params.set('end', endIso);
          navigate(`/bookings/new?${params.toString()}`);
        }}
      />

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
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All resources</SelectItem>
                  {resources.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name} ({r.resource_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-gray-600">Title</th>
                <th className="text-left py-3 px-4 text-gray-600">Type</th>
                <th className="text-left py-3 px-4 text-gray-600">Organizer</th>
                <th className="text-left py-3 px-4 text-gray-600">Resource</th>
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
                    <td className="py-3 px-4 text-gray-900">{booking.title}</td>
                    <td className="py-3 px-4 text-gray-600 capitalize">{booking.meeting_type}</td>
                    <td className="py-3 px-4 text-gray-600">{booking.organizer_email || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{booking.resource?.name || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{new Date(booking.start_time).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-gray-600">{new Date(booking.start_time).toLocaleTimeString()}</td>
                    <td className="py-3 px-4">
                      <Badge className={`${getStatusColor(booking.status)} text-white capitalize`}>
                        {booking.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{booking.external_calendar_id || '-'}</td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm" onClick={() => onViewBooking(String(booking.id))}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {booking.hangout_link && (
                        <a
                          href={booking.hangout_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center text-indigo-600 hover:text-indigo-800 ml-2"
                          title="Open in Google Calendar"
                        >
                          <CalendarIcon className="w-4 h-4" />
                        </a>
                      )}
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
