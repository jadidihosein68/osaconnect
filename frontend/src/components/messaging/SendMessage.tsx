import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Upload, Send } from 'lucide-react';
import { fetchContacts, fetchTemplates, sendOutbound, Contact, Template } from '../../lib/api';

export function SendMessage() {
  const [channel, setChannel] = useState('whatsapp');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contactId, setContactId] = useState<number | null>(null);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [cData, tData] = await Promise.all([fetchContacts(), fetchTemplates()]);
        setContacts(cData);
        setTemplates(tData);
      } catch {
        setError('Failed to load contacts/templates');
      }
    };
    load();
  }, []);

  const channelTemplates = useMemo(
    () => templates.filter((t) => t.channel === channel),
    [templates, channel],
  );

  const getTemplatePreview = () => {
    const tpl = channelTemplates.find((t) => String(t.id) === selectedTemplate);
    if (!tpl) return body || 'Select a template to see preview';
    let rendered = tpl.body;
    (tpl.variables || []).forEach((v) => {
      const placeholder = `{{${v}}}`;
      rendered = rendered.replace(placeholder, variables[v] || placeholder);
    });
    return rendered;
  };

  const handleSend = async () => {
    if (!contactId) {
      setError('Select a contact');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const tpl = channelTemplates.find((t) => String(t.id) === selectedTemplate);
      const renderedBody = tpl ? getTemplatePreview() : body;
      await sendOutbound({
        contact_id: contactId,
        channel,
        body: renderedBody,
      });
      setSuccess('Message sent');
      setBody('');
      setSelectedTemplate('');
      setVariables({});
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to send');
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
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Contact</Label>
              <Select value={contactId ? String(contactId) : ''} onValueChange={(v) => setContactId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a contact" />
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

            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {channelTemplates.map((tpl) => (
                    <SelectItem key={tpl.id} value={String(tpl.id)}>
                      {tpl.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="space-y-4 pt-4 border-t">
                <div className="text-gray-900">Template Variables</div>
                {(channelTemplates.find((t) => String(t.id) === selectedTemplate)?.variables || []).map((v) => (
                  <div className="space-y-2" key={v}>
                    <Label>{v}</Label>
                    <Input
                      placeholder={v}
                      value={variables[v] || ''}
                      onChange={(e) => setVariables({ ...variables, [v]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}
            {!selectedTemplate && (
              <div className="space-y-2">
                <Label>Custom Message</Label>
                <Textarea
                  placeholder="Type your message"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                />
              </div>
            )}

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
                  {getTemplatePreview()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
