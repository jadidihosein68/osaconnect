import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { ArrowLeft, Save, Trash2, MessageSquare, Send as SendIcon, Phone, Mail } from 'lucide-react';
import type { ContactPayload, Contact } from '../../lib/api';
import { createContact, fetchContact, updateContact, deleteContact } from '../../lib/api';

interface ContactDetailProps {
  contactId: string | null;
  onBack: () => void;
  onSaved?: (id: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
  { value: 'bounced', label: 'Bounced' },
];

const EMPTY_FORM: Required<ContactPayload> = {
  full_name: '',
  status: 'active',
  email: '',
  phone_whatsapp: '',
  telegram_chat_id: '',
  instagram_scoped_id: '',
  notes: '',
  segments: [],
  tags: [],
};

export function ContactDetail({ contactId, onBack, onSaved }: ContactDetailProps) {
  const isNew = !contactId || contactId === 'new';
  const [form, setForm] = useState(EMPTY_FORM);
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(isNew);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!contactId || contactId === 'new') {
        setContact(null);
        setForm(EMPTY_FORM);
        setIsEditing(true);
        setLoading(false);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchContact(contactId);
        if (ignore) return;
        setContact(data);
        setForm({
          full_name: data.full_name || '',
          status: data.status || 'active',
          email: data.email || '',
          phone_whatsapp: data.phone_whatsapp || '',
          telegram_chat_id: data.telegram_chat_id || '',
          instagram_scoped_id: data.instagram_scoped_id || '',
          notes: data.notes || '',
          segments: data.segments || [],
          tags: data.tags || [],
        });
        setIsEditing(false);
      } catch {
        if (!ignore) setError('Failed to load contact');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [contactId]);

  const handleChange = (field: keyof ContactPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let saved: Contact;
      if (isNew) {
        saved = await createContact(form);
        setContact(saved);
        onSaved?.(String(saved.id));
      } else {
        saved = await updateContact(contactId as string, form);
        setContact(saved);
      }
      setForm({
        full_name: saved.full_name,
        status: saved.status,
        email: saved.email || '',
        phone_whatsapp: saved.phone_whatsapp || '',
        telegram_chat_id: saved.telegram_chat_id || '',
        instagram_scoped_id: saved.instagram_scoped_id || '',
        notes: saved.notes || '',
        segments: saved.segments || [],
        tags: saved.tags || [],
      });
      setIsEditing(false);
    } catch {
      setError('Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!contactId || contactId === 'new') return;
    if (!window.confirm('Delete this contact?')) return;
    setDeleting(true);
    try {
      await deleteContact(contactId);
      onBack();
    } catch {
      setError('Failed to delete contact');
    } finally {
      setDeleting(false);
    }
  };

  const messageHistory = useMemo(
    () =>
      contact
        ? [
            {
              id: 1,
              type: 'inbound',
              channel: 'WhatsApp',
              message: 'Hi, I have a question about my booking',
              timestamp: '2 hours ago',
            },
            {
              id: 2,
              type: 'outbound',
              channel: 'WhatsApp',
              message: "Hello! I'd be happy to help. What would you like to know?",
              timestamp: '2 hours ago',
            },
          ]
        : [],
    [contact],
  );

  if (loading) return <p className="p-6">Loading contact...</p>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-gray-900 mb-1">{isNew ? 'New Contact' : contact?.full_name}</h1>
            <p className="text-gray-600">{isNew ? 'Create a new contact' : 'Contact Details'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="outline" onClick={() => setIsEditing((prev) => !prev)}>
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          )}
          {(isNew || isEditing) && (
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          )}
          {!isNew && (
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    disabled={!isEditing && !isNew}
                  />
                </div>
                {!isNew && (
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(val) => handleChange('status', val)}
                      disabled={!isEditing && !isNew}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={form.phone_whatsapp}
                    onChange={(e) => handleChange('phone_whatsapp', e.target.value)}
                    className="pl-10"
                    disabled={!isEditing && !isNew}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="pl-10"
                    disabled={!isEditing && !isNew}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telegram Client ID</Label>
                  <Input
                    value={form.telegram_chat_id}
                    onChange={(e) => handleChange('telegram_chat_id', e.target.value)}
                    disabled={!isEditing && !isNew}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instagram Scoped ID</Label>
                  <Input
                    value={form.instagram_scoped_id}
                    onChange={(e) => handleChange('instagram_scoped_id', e.target.value)}
                    disabled={!isEditing && !isNew}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={4}
                placeholder="Add notes about this contact..."
                disabled={!isEditing && !isNew}
              />
            </CardContent>
          </Card>

          {!isNew && (
            <Card>
              <CardHeader>
                <CardTitle>Message History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messageHistory.map((msg) => (
                    <div key={msg.id} className="flex gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          msg.type === 'inbound' ? 'bg-blue-100' : 'bg-green-100'
                        }`}
                      >
                        {msg.type === 'inbound' ? (
                          <MessageSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <SendIcon className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`${msg.type === 'inbound' ? 'text-blue-600' : 'text-green-600'}`}>
                            {msg.type === 'inbound' ? 'Inbound' : 'Outbound'}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600">{msg.channel}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500">{msg.timestamp}</span>
                        </div>
                        <p className="text-gray-900">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                  {messageHistory.length === 0 && <p className="text-gray-500 text-sm">No message history yet.</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge>{form.status.charAt(0).toUpperCase() + form.status.slice(1)}</Badge>
              <p className="text-gray-500 text-sm mt-2">
                Last inbound: {contact?.last_inbound_at || '—'}
                <br />
                Last outbound: {contact?.last_outbound_at || '—'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Segments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(form.segments || []).length === 0 && <p className="text-gray-500 text-sm">No segments assigned.</p>}
                {(form.segments || []).map((segment) => (
                  <Badge key={segment} variant="outline">
                    {segment}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
