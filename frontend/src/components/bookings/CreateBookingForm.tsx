import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { fetchContacts, createBooking, fetchResources, Contact, Resource } from '../../lib/api';

interface Props {
  onCreated: () => void;
}

export function CreateBookingForm({ onCreated }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState('');
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [resourceId, setResourceId] = useState<string>('none');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [attendees, setAttendees] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    fetchContacts().then(setContacts).catch(() => setError('Failed to load contacts'));
    fetchResources().then(setResources).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!contactId || !title || !start || !end) {
      setError('Contact, title, start, and end are required.');
      return;
    }
    setLoading(true);
    try {
      const attendeesList = attendees
        ? attendees
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean)
            .map((email) => ({ email }))
        : [];
      await createBooking({
        contact_id: Number(contactId),
        title,
        start_time: start,
        end_time: end,
        status,
        notes,
        location,
        resource_id: resourceId && resourceId !== 'none' ? Number(resourceId) : null,
        organizer_email: organizerEmail || undefined,
        attendees: attendeesList,
      });
      setSuccess('Booking created.');
      setTitle('');
      setStart('');
      setEnd('');
      setNotes('');
      setLocation('');
      setOrganizerEmail('');
      setAttendees('');
      setResourceId('');
      setStatus('pending');
      setContactId('');
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Booking</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-2">{success}</p>}
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Contact</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.full_name} ({c.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Resource (Room/Device)</Label>
              <Select value={resourceId} onValueChange={setResourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional resource" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {resources.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name} ({r.resource_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start</Label>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>End</Label>
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Organizer Email (optional)</Label>
            <Input value={organizerEmail} onChange={(e) => setOrganizerEmail(e.target.value)} placeholder="organizer@example.com" />
          </div>
          <div className="space-y-1">
            <Label>Attendees (comma separated emails)</Label>
            <Input value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="guest1@example.com, guest2@example.com" />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Booking'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
