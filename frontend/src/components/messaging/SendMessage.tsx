import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Upload, Send } from 'lucide-react';
import { fetchContacts, Contact, fetchContactGroups, ContactGroup, createEmailJob, uploadEmailAttachment } from '../../lib/api';
import { useRef } from 'react';
import { EditorState, Modifier, convertToRaw, ContentState, convertFromHTML } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import { Editor as DraftEditor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';

// Draft.js expects `global` and `process` in browser; polyfill here.
const draftGlobals: any = globalThis as any;
if (typeof draftGlobals.global === 'undefined') draftGlobals.global = globalThis;
if (typeof draftGlobals.process === 'undefined') draftGlobals.process = { env: { NODE_ENV: import.meta.env.MODE || 'development' } };

export function SendMessage() {
  const [channel] = useState('email');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('<p></p>');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<{ id: number; name: string; size: number; type: string }[]>([]);
  const [htmlMode, setHtmlMode] = useState(false);
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());

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
    const plain = draftToHtml(convertToRaw(editorState.getCurrentContent())).replace(/<[^>]+>/g, '').trim();
    if (!subject.trim() || plain.trim().length === 0) {
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
      const job = await createEmailJob({
        subject,
        body_html: body,
        body_text: plain,
        contact_ids: selectedContactIds,
        group_ids: selectedGroupIds,
        attachment_ids: attachments.map((a) => a.id),
      });
    setSuccess(`Email queued successfully. Excluded: ${job.excluded_count || 0}`);
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
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-gray-600">Compose in rich text or switch to HTML source.</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setHtmlMode((p) => !p)}>
                  {htmlMode ? 'Use Rich Text' : 'Edit HTML'}
                </Button>
              </div>
              <div className="border rounded-md p-2 bg-white min-h-[400px]">
                {htmlMode ? (
                  <textarea
                    className="w-full border rounded-md p-3 min-h-[300px] font-mono text-sm"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                ) : (
                  <DraftEditor
                    editorState={editorState}
                    onEditorStateChange={(state) => {
                      setEditorState(state);
                      setBody(draftToHtml(convertToRaw(state.getCurrentContent())));
                    }}
                    toolbar={{
                      options: ['inline', 'list', 'link'],
                      inline: { options: ['bold', 'italic', 'underline'] },
                      list: { options: ['ordered', 'unordered'] },
                      link: { options: ['link'] },
                    }}
                    editorStyle={{ minHeight: '320px', padding: '8px' }}
                  />
                )}
              </div>
            <div className="flex flex-wrap gap-2 text-sm mt-2">
              {['{{first_name}}', '{{last_name}}', '{{full_name}}', '{{company_name}}'].map((v) => (
                <Button
                  key={v}
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => {
                    const contentState = editorState.getCurrentContent();
                    const selection = editorState.getSelection();
                    const newContent = Modifier.insertText(contentState, selection, v);
                    const newState = EditorState.push(editorState, newContent, 'insert-characters');
                    setEditorState(EditorState.forceSelection(newState, newContent.getSelectionAfter()));
                    setBody(draftToHtml(convertToRaw(newContent)));
                  }}
                >
                  {v}
                </Button>
              ))}
              </div>
          </div>

          <div className="space-y-2">
            <Label>Attachments (Optional)</Label>
            <input
              type="file"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                for (const file of files) {
                  try {
                    const uploaded = await uploadEmailAttachment(file);
                    setAttachments((prev) => [...prev, { id: uploaded.id, name: uploaded.filename, size: uploaded.size, type: uploaded.content_type }]);
                  } catch (err: any) {
                    setError(err?.response?.data?.file?.[0] || 'Attachment upload failed');
                  }
                }
              }}
              className="border rounded p-2"
            />
            <div className="flex flex-wrap gap-2">
              {attachments.map((a) => (
                <span key={a.id} className="px-2 py-1 text-xs rounded-full border bg-gray-50">
                  {a.name} ({Math.round(a.size / 1024)} KB)
                  <button className="ml-2 text-red-500" onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}>×</button>
                </span>
              ))}
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
