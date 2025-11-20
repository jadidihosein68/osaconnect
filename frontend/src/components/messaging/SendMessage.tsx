import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Upload, Send } from 'lucide-react';
import { fetchContacts, Contact, fetchContactGroups, ContactGroup, createEmailJob } from '../../lib/api';

export function SendMessage() {
  const [channel] = useState('email');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [cData, gData] = await Promise.all([fetchContacts(), fetchContactGroups()]);
        setContacts(cData.filter((c) => c.email));
        setGroups(gData);
      } catch {
        setError('Failed to load contacts/groups');
      }
    };
    load();
  }, []);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Subject and body are required');
      return;
    }
    if (selectedContactIds.length === 0 && selectedGroupIds.length === 0) {
      setError('Select at least one contact or group');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await createEmailJob({
        subject,
        body_html: body,
        body_text: body,
        contact_ids: selectedContactIds,
        group_ids: selectedGroupIds,
      });
      setSuccess('Email queued successfully');
      setBody('');
      setSubject('');
      setSelectedContactIds([]);
      setSelectedGroupIds([]);
    } catch (e: any) {
      setError(e?.response?.data || e?.response?.data?.detail || 'Failed to send');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Send Message</h1>
        <p className="text-gray-600">Send individual messages to your contacts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Form */}
        <Card>
          <CardHeader>
            <CardTitle>Message Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">{success}</p>}
            <div className="space-y-2">
              <Label>Channel</Label>
              <Input value="Email (SendGrid)" disabled />
            </div>

            <div className="space-y-2">
              <Label>Recipients</Label>
              <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-2">
                {contacts.map((c) => {
                  const checked = selectedContactIds.includes(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={() =>
                          setSelectedContactIds((prev) =>
                            checked ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                          )
                        }
                      />
                      <span>{c.full_name} ({c.email})</span>
                    </label>
                  );
                })}
                {contacts.length === 0 && <div className="text-gray-500 text-sm">No contacts with email.</div>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Groups</Label>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => {
                  const checked = selectedGroupIds.includes(g.id);
                  return (
                    <Button
                      key={g.id}
                      type="button"
                      variant={checked ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        setSelectedGroupIds((prev) =>
                          checked ? prev.filter((id) => id !== g.id) : [...prev, g.id],
                        )
                      }
                    >
                      {g.name}
                    </Button>
                  );
                })}
                {groups.length === 0 && <span className="text-gray-500 text-sm">No groups yet.</span>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
            </div>

            <div className="space-y-2">
              <Label>Body (HTML allowed)</Label>
              <Textarea
                placeholder="Type your email body. Supported: basic HTML."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
              />
            </div>

            <div className="space-y-2">
              <Label>Attachments (Optional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                <p className="text-gray-500">PNG, JPG, PDF up to 10MB</p>
              </div>
            </div>

            <Button className="w-full" onClick={handleSend} disabled={loading}>
              <Send className="w-4 h-4 mr-2" />
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
          </CardContent>
        </Card>

        {/* Message Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Message Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 min-h-[400px]">
              <div className="mb-4">
                <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                  {channel.toUpperCase()}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="whitespace-pre-wrap text-gray-900">
                  {body || 'Compose your email to preview it here.'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
