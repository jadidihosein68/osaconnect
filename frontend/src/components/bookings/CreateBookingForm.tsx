import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { X } from 'lucide-react';
import { fetchContacts, fetchContactGroups, createBooking, fetchResources, fetchIntegrations, Contact, Resource, ContactGroup, Integration } from '../../lib/api';

interface Props {
  onCreated: () => void;
  onCancel?: () => void;
}

export function CreateBookingForm({ onCreated, onCancel }: Props) {
  const locationHook = useLocation();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [meetingType, setMeetingType] = useState<'custom' | 'room'>('custom');
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [locationField, setLocationField] = useState('');
  const [resourceId, setResourceId] = useState<string>('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerMode, setOrganizerMode] = useState<'select' | 'custom'>('select');
  const [contactIds, setContactIds] = useState<number[]>([]);
  const [groupIds, setGroupIds] = useState<number[]>([]);
  const [manualEmail, setManualEmail] = useState('');
  const [attendeeEmails, setAttendeeEmails] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [integrationOrganizer, setIntegrationOrganizer] = useState<string | null>(null);

  const toLocalInputValue = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  useEffect(() => {
    const params = new URLSearchParams(locationHook.search);
    const prefillStart = params.get('start') || sessionStorage.getItem('booking_prefill_start');
    const prefillEnd = params.get('end') || sessionStorage.getItem('booking_prefill_end');
    if (prefillStart) setStart(toLocalInputValue(prefillStart));
    if (prefillEnd) setEnd(toLocalInputValue(prefillEnd));
    sessionStorage.removeItem('booking_prefill_start');
    sessionStorage.removeItem('booking_prefill_end');
  }, [locationHook.search]);

  useEffect(() => {
    fetchContacts().then(setContacts).catch(() => setError('Failed to load contacts'));
    fetchContactGroups().then(setGroups).catch(() => {});
    fetchResources().then(setResources).catch(() => {});
    fetchIntegrations()
      .then((ints: Integration[]) => {
        const gc = ints.find((i) => i.provider === 'google_calendar' && i.is_active);
        const orgEmail = gc?.extra?.organizer_email;
        if (orgEmail) setIntegrationOrganizer(orgEmail as string);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (meetingType === 'custom') {
      setResourceId('');
    }
    if (meetingType === 'room') {
      const res = resources.find((r) => String(r.id) === resourceId);
      if (res) {
        setLocationField(res.description || res.name || '');
        if (res.gcal_calendar_id) {
          setOrganizerEmail(res.gcal_calendar_id);
          setOrganizerMode('select');
        }
      }
    }
  }, [resourceId, resources, meetingType]);

  useEffect(() => {
    if (meetingType === 'custom' && integrationOrganizer) {
      setOrganizerMode('select');
      setOrganizerEmail((prev) => prev || integrationOrganizer);
    }
    if (meetingType === 'custom' && !integrationOrganizer) {
      setOrganizerMode('custom');
    }
  }, [integrationOrganizer, meetingType]);

  const organizerOptions = useMemo(() => {
    // Only expose organizer emails configured in settings (per org)
    return integrationOrganizer ? [integrationOrganizer] : [];
  }, [integrationOrganizer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!title || !start || !end) {
      setError('Title, start, and end are required.');
      return;
    }
    if (meetingType === 'custom' && !organizerEmail) {
      setError('Organizer email is required for custom meetings.');
      return;
    }
    if (meetingType === 'room' && !resourceId) {
      setError('Resource is required for room/device bookings.');
      return;
    }
    setLoading(true);
    try {
      const startIso = new Date(start).toISOString();
      const endIso = new Date(end).toISOString();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      await createBooking({
        meeting_type: meetingType,
        title,
        start_time: startIso,
        end_time: endIso,
        notes,
        location: locationField,
        resource_id: meetingType === 'room' && resourceId ? Number(resourceId) : null,
        organizer_email: meetingType === 'custom' ? organizerEmail : undefined,
        attendee_emails: attendeeEmails,
        contact_ids: contactIds,
        group_ids: groupIds,
        timezone: tz,
      });
      setSuccess('Booking created.');
      setTitle('');
      setStart('');
      setEnd('');
      setNotes('');
      setLocationField('');
      setOrganizerEmail('');
      setManualEmail('');
      setAttendeeEmails([]);
      setContactIds([]);
      setGroupIds([]);
      setResourceId('');
      setMeetingType('custom');
      navigate('/bookings');
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const removeEmail = (email: string) => setAttendeeEmails((prev) => prev.filter((e) => e !== email));
  const removeContact = (id: number) => setContactIds((prev) => prev.filter((c) => c !== id));
  const removeGroup = (id: number) => setGroupIds((prev) => prev.filter((g) => g !== id));

  const addManualEmail = () => {
    const entries = manualEmail
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    if (!entries.length) return;
    setAttendeeEmails((prev) => Array.from(new Set([...prev, ...entries])));
    setManualEmail('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Booking</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-2">{success}</p>}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <Button type="button" variant={meetingType === 'custom' ? 'default' : 'outline'} onClick={() => setMeetingType('custom')}>
              Custom Meeting
            </Button>
            <Button type="button" variant={meetingType === 'room' ? 'default' : 'outline'} onClick={() => setMeetingType('room')}>
              Book Room/Device
            </Button>
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
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
                    <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Meeting context" rows={3} />
          </div>

       

          {meetingType === 'room' && (
            <div className="space-y-1">
              <Label>Resource (Room/Device)</Label>
              <Select value={resourceId || undefined} onValueChange={setResourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select resource" />
                </SelectTrigger>
                <SelectContent>
                  {resources.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name} ({r.resource_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {meetingType === 'custom' && (
            <div className="space-y-1">
              <Label>Organizer Email</Label>
              {organizerMode === 'select' ? (
                <Select value={organizerEmail} onValueChange={setOrganizerEmail}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organizer" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizerOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input value={organizerEmail} onChange={(e) => setOrganizerEmail(e.target.value)} placeholder="organizer@example.com" />
                  <Button type="button" variant="outline" onClick={() => setOrganizerMode('select')}>
                    Back
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label>Location</Label>
            <Input value={locationField} onChange={(e) => setLocationField(e.target.value)} disabled={meetingType === 'room'} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Add Contact</Label>
              <Select onValueChange={(val) => {
                const id = Number(val);
                setContactIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
                const contact = contacts.find((c) => c.id === id);
                if (contact?.email) setAttendeeEmails((prev) => Array.from(new Set([...prev, contact.email!])));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.full_name || c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Add Group</Label>
              <Select onValueChange={(val) => {
                const id = Number(val);
                setGroupIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Manual Emails (comma separated)</Label>
              <div className="flex gap-2">
                <Input value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="guest@example.com" />
                <Button type="button" variant="outline" onClick={addManualEmail}>Add</Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Attendees</Label>
            <div className="flex flex-wrap gap-2">
              {attendeeEmails.map((email) => (
                <span key={email} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs inline-flex items-center gap-1">
                  {email}
                  <button type="button" onClick={() => removeEmail(email)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {contactIds.map((id) => {
                const contact = contacts.find((c) => c.id === id);
                return contact ? (
                  <span key={`c-${id}`} className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs inline-flex items-center gap-1">
                    {contact.full_name || contact.email}
                    <button type="button" onClick={() => removeContact(id)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null;
              })}
              {groupIds.map((id) => {
                const group = groups.find((g) => g.id === id);
                return group ? (
                  <span key={`g-${id}`} className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs inline-flex items-center gap-1">
                    {group.name}
                    <button type="button" onClick={() => removeGroup(id)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          </div>



          


          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Booking'}
            </Button>
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
