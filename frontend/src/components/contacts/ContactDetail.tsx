import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { ArrowLeft, Save, MessageSquare, Phone, Mail, Send as SendIcon } from 'lucide-react';
import { fetchContacts, Contact } from '../../lib/api';

interface ContactDetailProps {
  contactId: string | null;
  onBack: () => void;
}

export function ContactDetail({ contactId, onBack }: ContactDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState('active');
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contactId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchContacts();
        const match = data.find((c) => String(c.id) === contactId);
        if (match) {
          setContact(match);
          setStatus(match.status);
        } else {
          setError('Contact not found');
        }
      } catch {
        setError('Failed to load contact');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [contactId]);

  if (!contactId) return null;
  if (loading) return <p className="p-6">Loading contact...</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!contact) return null;

  const messageHistory = [
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
      message: 'Hello John! I\'d be happy to help. What would you like to know?',
      timestamp: '2 hours ago',
    },
    {
      id: 3,
      type: 'outbound',
      channel: 'Email',
      message: 'Weekly Newsletter - November Edition',
      timestamp: '3 days ago',
    },
    {
      id: 4,
      type: 'inbound',
      channel: 'WhatsApp',
      message: 'Thanks for the information!',
      timestamp: '5 days ago',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-gray-900 mb-1">{contact.full_name}</h1>
            <p className="text-gray-600">Contact Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <Button onClick={() => setIsEditing(false)}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit Contact
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input defaultValue={contact.full_name} disabled={!isEditing} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus} disabled={!isEditing}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Blocked">Blocked</SelectItem>
                      <SelectItem value="Unsubscribed">Unsubscribed</SelectItem>
                      <SelectItem value="Bounced">Bounced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input defaultValue={contact.phone_whatsapp || ''} disabled={!isEditing} className="pl-10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input defaultValue={contact.email || ''} disabled={!isEditing} className="pl-10" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telegram ID</Label>
                  <Input defaultValue={contact.telegram_chat_id || ''} disabled={!isEditing} />
                </div>
                <div className="space-y-2">
                  <Label>Instagram ID</Label>
                  <Input defaultValue={contact.instagram_scoped_id || ''} disabled={!isEditing} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Segments / Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(contact.segments || []).map((segment) => (
                  <Badge key={segment} variant="outline">
                    {segment}
                  </Badge>
                ))}
                {isEditing && (
                  <Button variant="outline" size="sm">
                    + Add Tag
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                defaultValue={contact.notes}
                disabled={!isEditing}
                rows={4}
                placeholder="Add notes about this contact..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messageHistory.map((msg) => (
                  <div key={msg.id} className="flex gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      msg.type === 'inbound' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {msg.type === 'inbound' ? (
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <SendIcon className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`${
                          msg.type === 'inbound' ? 'text-blue-600' : 'text-green-600'
                        }`}>
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
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Message
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Phone className="w-4 h-4 mr-2" />
                Call Contact
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-gray-600 mb-1">Created Date</div>
                <div className="text-gray-900">{contact.createdDate}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Last Updated</div>
                <div className="text-gray-900">{contact.updatedDate}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
