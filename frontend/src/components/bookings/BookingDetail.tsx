import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { fetchBookings, fetchResources, Booking, updateBooking, Resource, deleteBooking } from '../../lib/api';

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
    notes: '',
    location: '',
    organizer_email: '',
    resource_id: '' as string,
    attendee_emails: '' as string,
  });
  const [resources, setResources] = useState<Resource[]>([]);

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
            notes: match.notes || '',
            location: match.location || '',
            organizer_email: match.organizer_email || '',
            resource_id: match.resource?.id ? String(match.resource.id) : '',
            attendee_emails: (match.attendees || []).map((a: any) => a.email).filter(Boolean).join(', '),
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

  useEffect(() => {
    fetchResources().then(setResources).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!booking) return;
    setError(null);
    setLoading(true);
    try {
      const updated = await updateBooking(booking.id, {
        title: form.title,
        start_time: form.start_time ? new Date(form.start_time).toISOString() : undefined,
        end_time: form.end_time ? new Date(form.end_time).toISOString() : undefined,
        notes: form.notes,
        location: form.location,
        organizer_email: form.organizer_email || undefined,
        resource_id: form.resource_id ? Number(form.resource_id) : undefined,
        attendee_emails: form.attendee_emails
          ? form.attendee_emails
              .split(',')
              .map((e) => e.trim())
              .filter(Boolean)
          : undefined,
      });
      setBooking({ ...booking, ...updated });
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update booking');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!booking) return;
    if (!window.confirm('Delete this booking? This will cancel the calendar entry as well.')) return;
    setLoading(true);
    setError(null);
    try {
      await deleteBooking(booking.id);
      onBack();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to delete booking');
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
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
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
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} disabled={!isEditing} rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label>Organizer</Label>
                    <Input
                      value={form.organizer_email}
                      onChange={(e) => setForm((f) => ({ ...f, organizer_email: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="organizer@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Resource (for room/device bookings)</Label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={form.resource_id}
                      onChange={(e) => setForm((f) => ({ ...f, resource_id: e.target.value }))}
                      disabled={!isEditing}
                    >
                      <option value="">No resource</option>
                      {resources.map((r) => (
                        <option key={r.id} value={String(r.id)}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Attendees</Label>
                    <div className="flex flex-wrap gap-2">
                      {(booking.attendees || []).map((a, idx) => (
                        <span key={`${a.email}-${idx}`} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                          {a.email}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {!booking && (
                <div className="text-gray-600">Creation form is not implemented yet.</div>
              )}
            </CardContent>
          </Card>

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
                    <div className="text-gray-600 mb-1">Meeting Type</div>
                    <div className="text-gray-900 capitalize">{booking.meeting_type}</div>
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
