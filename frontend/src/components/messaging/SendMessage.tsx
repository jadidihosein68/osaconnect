import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Send } from 'lucide-react';
import {
  fetchContacts,
  Contact,
  fetchContactGroups,
  ContactGroup,
  createEmailJob,
  uploadEmailAttachment,
  fetchTemplates,
  Template,
  fetchTelegramMessages,
  sendTelegramMessage,
  TelegramMessage,
} from '../../lib/api';
import { EditorState, Modifier, convertToRaw, ContentState, convertFromHTML } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import { Editor as DraftEditor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';

// Draft.js expects `global` and `process` in browser; polyfill here.
const draftGlobals: any = globalThis as any;
if (typeof draftGlobals.global === 'undefined') draftGlobals.global = globalThis;
if (typeof draftGlobals.process === 'undefined') draftGlobals.process = { env: { NODE_ENV: import.meta.env.MODE || 'development' } };

export function SendMessage() {
  const [channel, setChannel] = useState<'email' | 'telegram'>('email');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [selectedTelegramContactId, setSelectedTelegramContactId] = useState<number | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('<p></p>');
  const [telegramText, setTelegramText] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastExclusions, setLastExclusions] = useState<any[]>([]);
  const [lastJobBatch, setLastJobBatch] = useState<any | null>(null);
  const [attachments, setAttachments] = useState<{ id: number; name: string; size: number; type: string }[]>([]);
  const [htmlMode, setHtmlMode] = useState(false);
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
  const [telegramMessages, setTelegramMessages] = useState<TelegramMessage[]>([]);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [cData, gData, tData] = await Promise.all([fetchContacts(), fetchContactGroups(), fetchTemplates()]);
        const emailTemplates = tData.filter((t) => t.channel === 'email');
        setContacts(cData);
        setGroups(gData);
        setTemplates(emailTemplates);
        const defaultTpl = emailTemplates.find((t) => t.is_default) || emailTemplates[0];
        if (defaultTpl) {
          setSelectedTemplateId(String(defaultTpl.id));
          setSubject(defaultTpl.subject || '');
          setEmailBody(defaultTpl.body || '');
          try {
            const blocksFromHTML = convertFromHTML(defaultTpl.body || '');
            const cs = ContentState.createFromBlockArray(blocksFromHTML.contentBlocks, blocksFromHTML.entityMap);
            setEditorState(EditorState.createWithContent(cs));
          } catch {
            /* ignore */
          }
        }
      } catch {
        setError('Failed to load contacts/groups');
      }
    };
    load();
  }, []);

  // Poll telegram messages for selected contact
  useEffect(() => {
    let timer: any;
    const poll = async () => {
      if (channel !== 'telegram' || !selectedTelegramContactId) return;
      setTelegramLoading(true);
      setTelegramError(null);
      try {
        const msgs = await fetchTelegramMessages(selectedTelegramContactId);
        setTelegramMessages(msgs);
      } catch {
        setTelegramError('Failed to load conversation.');
      } finally {
        setTelegramLoading(false);
      }
    };
    poll();
    if (channel === 'telegram' && selectedTelegramContactId) {
      timer = setInterval(poll, 5000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [channel, selectedTelegramContactId]);

  const onboardedContacts = useMemo(
    () => contacts.filter((c) => c.telegram_status === 'onboarded' && c.telegram_chat_id),
    [contacts],
  );
  const selectedTelegramContact = useMemo(
    () => contacts.find((c) => c.id === selectedTelegramContactId) || null,
    [contacts, selectedTelegramContactId],
  );
  const filteredOnboarded = useMemo(
    () =>
      onboardedContacts.filter((c) =>
        c.full_name.toLowerCase().includes(recipientSearch.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(recipientSearch.toLowerCase()),
      ),
    [onboardedContacts, recipientSearch],
  );
  useEffect(() => {
    if (channel !== 'telegram' || !selectedTelegramContactId) {
      setTelegramMessages([]);
      setTelegramError(null);
    }
  }, [channel, selectedTelegramContactId]);

  const handleSend = async () => {
    if (channel === 'telegram') {
      if (!selectedTelegramContactId) {
        setError('Select a contact for Telegram.');
        return;
      }
      const textOnly = telegramText.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim();
      const text = textOnly || telegramText.trim();
      if (!text) {
        setError('Message cannot be empty');
        return;
      }
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        await sendTelegramMessage(selectedTelegramContactId, { text });
        setSuccess('Telegram message sent.');
        setTelegramText('');
        const msgs = await fetchTelegramMessages(selectedTelegramContactId);
        setTelegramMessages(msgs);
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Failed to send Telegram message');
      } finally {
        setLoading(false);
      }
      return;
    }

    const plain = (emailBody || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
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
        body_html: emailBody,
        body_text: plain,
        contact_ids: selectedContactIds,
        group_ids: selectedGroupIds,
        attachment_ids: attachments.map((a) => a.id),
        template_id: selectedTemplateId ? Number(selectedTemplateId) : undefined,
      });
      setSuccess(`Email queued successfully. Excluded: ${job.excluded_count || 0}`);
      setLastExclusions(job.exclusions || []);
      setLastJobBatch(job.batch_config || null);
      setEmailBody('');
      setSubject('');
      setEditorState(EditorState.createEmpty());
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
        {/* Message Form / Telegram Chat */}
        <Card>
          <CardHeader>
            <CardTitle>Message Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">{success}</p>}
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select
                value={channel}
                onValueChange={(val) => {
                  setChannel(val as 'email' | 'telegram');
                  setSelectedContactIds([]);
                  setSelectedGroupIds([]);
                  setSelectedTelegramContactId(null);
                  setEmailBody('<p></p>');
                  setTelegramText('');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email (SendGrid)</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {channel === 'email' ? (
              <>
                <div className="space-y-2">
                  <Label>Recipients</Label>
                  <Input
                    placeholder="Search recipients by name"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                  />
                  <div className="h-56 overflow-y-auto border rounded p-2 space-y-2 bg-white">
                    {contacts
                      .filter((c) => c.full_name.toLowerCase().includes(recipientSearch.toLowerCase()))
                      .map((c) => {
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
                    {contacts.filter((c) => c.full_name.toLowerCase().includes(recipientSearch.toLowerCase())).length === 0 && (
                      <div className="text-gray-500 text-sm">No recipients found.</div>
                    )}
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
                  <Label>Template</Label>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={(val) => {
                      setSelectedTemplateId(val);
                      const tpl = templates.find((t) => String(t.id) === val);
                      if (tpl) {
                        setSubject(tpl.subject || tpl.name || '');
                        setEmailBody(tpl.body || '');
                        try {
                          const blocksFromHTML = convertFromHTML(tpl.body || '');
                          const cs = ContentState.createFromBlockArray(blocksFromHTML.contentBlocks, blocksFromHTML.entityMap);
                          const st = EditorState.createWithContent(cs);
                          setEditorState(st);
                        } catch {
                          /* ignore */
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}
                        </SelectItem>
                      ))}
                      {templates.length === 0 && <SelectItem value="none" disabled>No templates</SelectItem>}
                    </SelectContent>
                  </Select>
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
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                      />
                    ) : (
                      <DraftEditor
                        editorState={editorState}
                        onEditorStateChange={(state) => {
                          setEditorState(state);
                          setEmailBody(draftToHtml(convertToRaw(state.getCurrentContent())));
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
                    {['{{first_name}}', '{{last_name}}', '{{full_name}}', '{{company_name}}', '{{unsubscribe_link}}'].map((v) => (
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
                          setEmailBody(draftToHtml(convertToRaw(newContent)));
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

                <div className="space-y-3">
                  {lastJobBatch && (
                    <p className="text-sm text-gray-600">
                      Batch: {lastJobBatch.batch_size} per {lastJobBatch.batch_delay_seconds}s, retries {lastJobBatch.max_retries} (delay {lastJobBatch.retry_delay_seconds}s)
                    </p>
                  )}
                  <Button className="w-full" onClick={handleSend} disabled={loading}>
                    <Send className="w-4 h-4 mr-2" />
                    {loading ? 'Sending...' : 'Send Message'}
                  </Button>
                  {lastExclusions.length > 0 && (
                    <div className="text-sm text-gray-700 border rounded p-2">
                      Excluded recipients:
                      <ul className="list-disc list-inside max-h-32 overflow-y-auto">
                        {lastExclusions.map((ex, idx) => (
                          <li key={idx}>{ex.email || ex.contact_id} — {ex.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Search Contacts</Label>
                  <Input
                    placeholder="Search by name or email"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                  />
                </div>
                <div className="h-64 overflow-y-auto border rounded p-2 space-y-2 bg-white">
                  {filteredOnboarded.map((c) => {
                    const selected = selectedTelegramContactId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 rounded border ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'}`}
                        onClick={() => setSelectedTelegramContactId(c.id)}
                      >
                        <div className="font-medium text-sm text-gray-900">{c.full_name}</div>
                        <div className="text-xs text-gray-600">{c.email || '—'}</div>
                      </button>
                    );
                  })}
                  {filteredOnboarded.length === 0 && (
                    <div className="text-gray-500 text-sm">
                      No Telegram-onboarded contacts found. Please onboard contacts via Telegram Onboarding.
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Only contacts with Telegram onboarding completed (chat connected) appear here.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {channel === 'email' ? (
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
                  <div className="text-gray-500 text-sm mb-2">
                    <div>From: (SendGrid default)</div>
                    <div>Subject: {subject || '—'}</div>
                  </div>
                  <div className="prose max-w-none text-gray-900" dangerouslySetInnerHTML={{ __html: emailBody || '<p>Compose your email to preview it here.</p>' }} />
                  {templates.length > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Footer (from template)</div>
                      <div
                        className="prose max-w-none text-sm text-gray-700"
                        dangerouslySetInnerHTML={{
                          __html:
                            templates.find((t) => String(t.id) === selectedTemplateId)?.footer ||
                            templates.find((t) => t.is_default && t.channel === 'email')?.footer ||
                            '',
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Active contact</div>
                  <div className="text-lg font-semibold text-gray-900">{selectedTelegramContact?.full_name || 'Select a contact'}</div>
                  {selectedTelegramContact?.email && <div className="text-xs text-gray-600">{selectedTelegramContact.email}</div>}
                </div>
              </div>
              <div className="h-[420px] overflow-y-auto border rounded p-3 bg-gray-50">
                {!selectedTelegramContact && <div className="text-sm text-gray-500">Select a contact on the left to view the conversation.</div>}
                {selectedTelegramContact && telegramLoading && <div className="text-sm text-gray-500">Loading conversation...</div>}
                {selectedTelegramContact && telegramError && <div className="text-sm text-red-600">{telegramError}</div>}
                {selectedTelegramContact && !telegramLoading && telegramMessages.length === 0 && <div className="text-sm text-gray-500">No messages yet.</div>}
                {selectedTelegramContact &&
                  telegramMessages.map((m) => (
                    <div key={m.id} className={`mb-3 flex ${m.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-md px-3 py-2 rounded-lg shadow-sm ${m.direction === 'OUTBOUND' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900 border'}`}>
                        <div className="text-xs opacity-80 mb-1">{m.direction === 'OUTBOUND' ? 'Bot' : selectedTelegramContact.full_name || 'User'}</div>
                        <div className="text-sm whitespace-pre-wrap">{m.text || '—'}</div>
                        <div className="text-[11px] mt-1 opacity-70">{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</div>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="space-y-2">
                <Label>New message</Label>
                <Textarea
                  placeholder="Write a message..."
                  value={telegramText}
                  onChange={(e) => setTelegramText(e.target.value)}
                  rows={4}
                  disabled={!selectedTelegramContactId}
                />
                <Button onClick={handleSend} disabled={loading || !selectedTelegramContactId}>
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
