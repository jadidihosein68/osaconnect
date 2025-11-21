import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { ArrowLeft, Save, Plus, X, Trash2 } from 'lucide-react';
import type { TemplatePayload, Template } from '../../lib/api';
import { fetchTemplate, createTemplate, updateTemplate, deleteTemplate, approveTemplate } from '../../lib/api';

interface TemplateEditorProps {
  templateId: string | null;
  onBack: () => void;
  onSaved?: () => void;
}

const CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'instagram', label: 'Instagram' },
];

const EMPTY_FORM: TemplatePayload = {
  name: '',
  channel: 'whatsapp',
  language: 'en',
  subject: '',
  body: '',
  footer: '',
  is_default: false,
  variables: [],
  category: '',
};

type VariableInput = { name: string; fallback: string };

export function TemplateEditor({ templateId, onBack, onSaved }: TemplateEditorProps) {
  const isNew = !templateId || templateId === 'new';
  const [form, setForm] = useState<TemplatePayload>(EMPTY_FORM);
  const [variables, setVariables] = useState<VariableInput[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (isNew) {
        setForm({ ...EMPTY_FORM, channel: 'email', footer: "If you no longer wish to receive these emails, you can unsubscribe here: {{unsubscribe_link}}", is_default: true });
        setVariables([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchTemplate(templateId!);
        if (ignore) return;
        const normalizedVariables = (data.variables || []).map((entry) =>
          typeof entry === 'string' ? { name: entry, fallback: '' } : { name: entry.name || '', fallback: entry.fallback || '' },
        );
        setForm({
          name: data.name,
          channel: data.channel,
          language: data.language || 'en',
          subject: data.subject || '',
          body: data.body,
          footer: data.footer || '',
          is_default: Boolean(data.is_default),
          variables: normalizedVariables,
          category: data.category || '',
          approved: data.approved,
          approved_by: data.approved_by,
          approved_at: data.approved_at,
        });
        setVariables(normalizedVariables);
      } catch (err) {
        if (!ignore) setError('Failed to load template');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [templateId, isNew]);

  const handleChange = (field: keyof TemplatePayload, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value as any }));
  };

  const addVariable = () => setVariables((prev) => [...prev, { name: '', fallback: '' }]);
  const removeVariable = (index: number) => setVariables((prev) => prev.filter((_, i) => i !== index));
  const updateVariable = (index: number, field: keyof VariableInput, value: string) => {
    setVariables((prev) => prev.map((variable, i) => (i === index ? { ...variable, [field]: value } : variable)));
  };

  const previewBody = useMemo(() => {
    let preview = form.body;
    variables.forEach((variable) => {
      if (variable.name) {
        const regex = new RegExp(`\\{${variable.name}\\}`, 'g');
        preview = preview.replace(regex, variable.fallback || `{${variable.name}}`);
      }
    });
    return preview;
  }, [form.body, variables]);

  const validate = () => {
    if (!form.name.trim()) {
      setError('Template name is required');
      return false;
    }
    if (!form.body.trim()) {
      setError('Template body is required');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const payload: TemplatePayload = {
      ...form,
      variables: variables
        .filter((v) => v.name.trim())
        .map((v) => ({ name: v.name.trim(), fallback: v.fallback || '' })),
      subject: form.channel === 'email' ? form.subject || '' : '',
      footer: form.channel === 'email' ? form.footer || '' : '',
    };
    try {
      let result: Template;
      if (isNew) {
        result = await createTemplate(payload);
      } else {
        result = await updateTemplate(templateId!, payload);
      }
      setMessage('Template saved successfully.');
      if (isNew) {
        const normalizedVariables = (result.variables || []).map((entry) =>
          typeof entry === 'string' ? { name: entry, fallback: '' } : { name: entry.name || '', fallback: entry.fallback || '' },
        );
        setForm({
          name: result.name,
          channel: result.channel,
          language: result.language || 'en',
          subject: result.subject || '',
          body: result.body,
          footer: result.footer || '',
          is_default: Boolean(result.is_default),
          variables: normalizedVariables,
          category: result.category || '',
        });
        setVariables(normalizedVariables);
      }
      onSaved?.();
    } catch {
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!templateId || isNew) return;
    if (!window.confirm('Delete this template?')) return;
    setDeleting(true);
    try {
      await deleteTemplate(templateId);
      onBack();
    } catch {
      setError('Failed to delete template');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <p className="p-6">Loading template...</p>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-gray-900 mb-1">{isNew ? 'Create Template' : 'Edit Template'}</h1>
            <p className="text-gray-600">Design your message template</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
          {!isNew && !form.is_default && (
            <Button variant="outline" onClick={() => handleChange('is_default', true)}>
              Set Default
            </Button>
          )}
          {!isNew && !form.approved && (
            <Button variant="outline" onClick={async () => {
              setApproving(true);
              setError(null);
              try {
                await approveTemplate(templateId!);
                // reload to capture approved metadata
                const data = await fetchTemplate(templateId!);
                const normalizedVariables = (data.variables || []).map((entry) =>
                  typeof entry === 'string' ? { name: entry, fallback: '' } : { name: entry.name || '', fallback: entry.fallback || '' },
                );
                setForm({
                  name: data.name,
                  channel: data.channel,
                  language: data.language || 'en',
                  subject: data.subject || '',
                  body: data.body,
                  footer: data.footer || '',
                  is_default: Boolean(data.is_default),
                  variables: normalizedVariables,
                  category: data.category || '',
                  approved: data.approved,
                  approved_by: data.approved_by,
                  approved_at: data.approved_at,
                });
                setVariables(normalizedVariables);
                setMessage('Template approved.');
              } catch {
                setError('Failed to approve template.');
              } finally {
                setApproving(false);
              }
            }} disabled={approving}>
              {approving ? 'Approving...' : 'Approve'}
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
      {message && <p className="text-green-600 text-sm">{message}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-500">
                Template name length: <span className="font-medium text-gray-800">{form.name.length}</span> characters
              </div>
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g., Booking Confirmation" />
              </div>

              <div className="space-y-2">
                <Label>Channel</Label>
                <Select
                  value={form.channel}
                  onValueChange={(val) => {
                    handleChange('channel', val);
                    if (val === 'email' && !form.footer) {
                      handleChange('footer', "If you no longer wish to receive these emails, you can unsubscribe here: {{unsubscribe_link}}");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((channel) => (
                      <SelectItem key={channel.value} value={channel.value}>
                        {channel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.channel === 'email' && (
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={form.subject} onChange={(e) => handleChange('subject', e.target.value)} placeholder="Email subject line" />
                </div>
              )}

              {form.channel === 'email' && (
                <div className="space-y-2">
                  <Label>Footer (HTML allowed)</Label>
                  <Textarea
                    placeholder="Add footer. Include {{unsubscribe_link}} to insert the unsubscribe button."
                value={form.footer || ''}
                onChange={(e) => handleChange('footer', e.target.value)}
                rows={4}
              />
              <div className="text-xs text-gray-500">
                    Default footer includes a clickable unsubscribe link via <code>{'{{unsubscribe_link}}'}</code>.
              </div>
            </div>
          )}

              {form.channel === 'email' && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={Boolean(form.is_default)}
                    onChange={(e) => handleChange('is_default', e.target.checked)}
                  />
                  <span>Set as default template for Email</span>
                </label>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message Body</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter your message template here. Use {variable_name} for dynamic content."
                value={form.body}
                onChange={(e) => handleChange('body', e.target.value)}
                rows={12}
              />
              <div className="mt-2 text-gray-600">Tip: Use curly braces for variables, e.g., {'{name}'}, {'{date}'}</div>
              <div className="text-sm text-gray-500">
                Message length: <span className="font-medium text-gray-800">{form.body.length}</span> characters
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Variables</CardTitle>
                <Button variant="outline" size="sm" onClick={addVariable}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Variable
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {variables.length === 0 ? (
                <div className="text-center py-6 text-gray-500">No variables yet.</div>
              ) : (
                variables.map((variable, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Variable name (e.g., name)"
                        value={variable.name}
                        onChange={(e) => updateVariable(index, 'name', e.target.value)}
                      />
                      <Input
                        placeholder="Fallback value"
                        value={variable.fallback}
                        onChange={(e) => updateVariable(index, 'fallback', e.target.value)}
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeVariable(index)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 min-h-[400px]">
                <div className="mb-4">
                  <Badge className="bg-green-100 text-green-700">{form.channel.toUpperCase()}</Badge>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="whitespace-pre-wrap text-gray-900">
                    {previewBody || 'Your message preview will appear here...'}
                  </div>
                  {form.channel === 'email' && (form.footer?.trim() || form.is_default) && (
                    <div className="mt-4 pt-3 border-t text-sm text-gray-700 whitespace-pre-wrap">
                      {form.footer || 'Default footer with {{unsubscribe_link}}'}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-600 text-sm space-y-2">
              <div>
                <span className="font-medium text-gray-800">Template Name:</span> {form.name || 'Untitled'}
              </div>
              <div>
                <span className="font-medium text-gray-800">Message Length:</span> {form.body.length} characters
              </div>
              <div>
                <span className="font-medium text-gray-800">Channel:</span> {form.channel.toUpperCase()}
              </div>
              <div>
                <span className="font-medium text-gray-800">Language:</span> {form.language || 'en'}
              </div>
              <div>
                <span className="font-medium text-gray-800">Category:</span> {form.category || '—'}
              </div>
              <div>
                <span className="font-medium text-gray-800">Variables:</span> {variables.length}
              </div>
              <div>
                <span className="font-medium text-gray-800">Approved:</span>{' '}
                {form.approved ? (
                  <span className="text-green-700">Yes</span>
                ) : (
                  <span className="text-gray-500">No</span>
                )}
              </div>
              {form.approved && (
                <>
                  <div>
                    <span className="font-medium text-gray-800">Approved By:</span> {form.approved_by || '—'}
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">Approved At:</span>{' '}
                    {form.approved_at ? new Date(form.approved_at).toLocaleString() : '—'}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
