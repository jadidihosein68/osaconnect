import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { ArrowLeft, Save, Calendar, Send } from 'lucide-react';
import { fetchBookings, Booking, updateBooking } from '../../lib/api';

interface BookingDetailProps {
  bookingId: string | null;
  onBack: () => void;
}

export function BookingDetail({ bookingId, onBack }: BookingDetailProps) {
  const [isEditing, setIsEditing] = useState(!bookingId);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    start_time: '',
    end_time: '',
    status: '',
    notes: '',
    location: '',
  });

  useEffect(() => {
    if (!bookingId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchBookings();
        const match = data.find((b) => String(b.id) === bookingId);
        if (match) {
          setBooking(match);
          setForm({
            title: match.title || '',
            start_time: match.start_time ? match.start_time.slice(0, 16) : '',
            end_time: match.end_time ? match.end_time.slice(0, 16) : '',
            status: match.status || 'pending',
            notes: match.notes || '',
            location: match.location || '',
          });
        }
        else setError('Booking not found');
      } catch {
        setError('Failed to load booking');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId]);

  const handleSave = async () => {
    if (!booking) return;
    setError(null);
    setLoading(true);
    try {
      const updated = await updateBooking(booking.id, {
        title: form.title,
        start_time: form.start_time,
        end_time: form.end_time,
        status: form.status,
        notes: form.notes,
        location: form.location,
      });
      setBooking({ ...booking, ...updated });
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update booking');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) return <p className="p-6">Loading booking...</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!booking && bookingId) return <p className="p-6 text-gray-600">Booking not found</p>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-gray-900 mb-1">
              {bookingId ? 'Booking Details' : 'Create New Booking'}
            </h1>
            <p className="text-gray-600">
              {bookingId ? `Event ID: ${booking?.external_calendar_id || '-'}` : 'Fill in the details below'}
            </p>
          </div>
        </div>
        {bookingId && (
          <div className="flex gap-2">
            {isEditing ? (
              <Button onClick={handleSave} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit Booking
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking && (
                <>
                  <div className="space-y-2">
                    <Label>Contact</Label>
                    <Input value={booking.contact?.full_name || ''} disabled />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start</Label>
                      <Input
                        type="datetime-local"
                        value={form.start_time}
                        onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End</Label>
                      <Input
                        type="datetime-local"
                        value={form.end_time}
                        onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Input
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} disabled={!isEditing} rows={4} />
                  </div>
                </>
              )}
              {!booking && (
                <div className="text-gray-600">Creation form is not implemented yet.</div>
              )}
            </CardContent>
          </Card>

          {booking && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" variant="outline">
                    <Send className="w-4 h-4 mr-2" />
                    Send Reminder
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="w-4 h-4 mr-2" />
                    Add to Calendar
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {booking && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={`${getStatusColor(booking.status)} text-white text-lg px-4 py-2`}>
                    {booking.status.toUpperCase()}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-gray-600 mb-1">External Calendar ID</div>
                    <div className="text-gray-900">{booking.external_calendar_id || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Location</div>
                    <div className="text-gray-900">{booking.location || '-'}</div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
