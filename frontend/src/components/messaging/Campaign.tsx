import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Send, Users, DollarSign } from 'lucide-react';
import {
  fetchContactGroups,
  fetchTemplates,
  fetchIntegrations,
  fetchCampaignThrottle,
  fetchCampaignCosts,
  fetchContacts,
  createCampaign,
  CampaignCreatePayload,
  ContactGroup,
  Template,
  Integration,
  Contact,
  CampaignCostConfig,
} from '../../lib/api';

export function Campaign() {
  const [channel, setChannel] = useState('whatsapp');
  const [campaignName, setCampaignName] = useState('');
  const [groupIds, setGroupIds] = useState<number[]>([]);
  const [uploadRows, setUploadRows] = useState<Array<{ name?: string; email?: string; phone?: string }>>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>(undefined);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [throttleLimit, setThrottleLimit] = useState<number | null>(null);
  const [targetCount, setTargetCount] = useState<number>(0);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [costs, setCosts] = useState<CampaignCostConfig | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
      const [grp, tpl, ints, throttle, costConfig, contactList] = await Promise.all([
        fetchContactGroups(),
        fetchTemplates(),
        fetchIntegrations(),
        fetchCampaignThrottle(),
        fetchCampaignCosts(),
        fetchContacts(),
      ]);
        setGroups(grp);
        setTemplates(tpl);
        setIntegrations(ints);
        setCosts(costConfig);
        setContacts(contactList);
        // pick channel-specific limit if available
        const limit = throttle.per_channel?.[channel] || throttle.default_limit;
        setThrottleLimit(limit);
      } catch {
        setError('Failed to load campaign data.');
      }
    };
    load();
  }, []);

  const availableChannels = useMemo(() => {
    // Map integration providers to campaign channel keys
    const enabled = new Set(integrations.filter((i) => i.is_active).map((i) => i.provider));
    const channels: string[] = [];
    if (enabled.has('sendgrid')) channels.push('email');
    if (enabled.has('whatsapp')) channels.push('whatsapp');
    if (enabled.has('telegram')) channels.push('telegram');
    if (enabled.has('instagram')) channels.push('instagram');
    return channels;
  }, [integrations]);

  const templateOptions = useMemo(() => templates.filter((t) => t.channel === channel), [templates, channel]);

  const channelLabel = (ch: string) => {
    if (ch === 'email') return 'Email (SendGrid)';
    if (ch === 'whatsapp') return 'WhatsApp';
    if (ch === 'telegram') return 'Telegram';
    if (ch === 'instagram') return 'Instagram';
    return ch;
  };

  useEffect(() => {
    if (availableChannels.length > 0 && !availableChannels.includes(channel)) {
      setChannel(availableChannels[0]);
    }
  }, [availableChannels]);

  // Recalculate targets & cost when selection changes
  useEffect(() => {
    const keyField = (ch: string) => {
      if (ch === 'email') return 'email';
      if (ch === 'whatsapp') return 'phone_whatsapp';
      if (ch === 'telegram') return 'telegram_chat_id';
      if (ch === 'instagram') return 'instagram_scoped_id';
      return 'id';
    };
    const field = keyField(channel);
    const dedupe = new Set<string>();

    // From groups
    contacts.forEach((c) => {
      if (groupIds.length === 0) return;
      const membership = (c.groups || []) as any[];
      const groupMatch = membership.some((g: any) => groupIds.includes(typeof g === 'number' ? g : g.id));
      if (!groupMatch) return;
      const keyVal: any = (c as any)[field];
      if (!keyVal) return;
      dedupe.add(String(keyVal));
    });

    // From upload rows
    uploadRows.forEach((row) => {
      const keyVal = channel === 'email' ? row.email : row.phone;
      if (keyVal) dedupe.add(String(keyVal));
    });

    const count = dedupe.size;
    setTargetCount(count);

    const amt = costs?.channels?.[channel]?.pricing?.outbound?.amount;
    let rate = 0;
    if (typeof amt === 'number') {
      rate = amt;
    } else if (amt && typeof amt === 'object' && typeof amt.markup === 'number') {
      rate = amt.markup;
    }
    setEstimatedCost(Number((count * rate).toFixed(4)));
  }, [groupIds, uploadRows, channel, contacts, costs]);

  const handleUploadCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) return;
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(',');
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = cols[idx]?.trim() || '';
        });
        return {
          name: row.name || '',
          email: row.email || '',
          phone: row.phone || row.phone_whatsapp || '',
        };
      });
      setUploadRows(rows);
    };
    reader.onerror = () => setError('Failed to parse CSV');
    reader.readAsText(file);
  };

  const handleStart = async () => {
    setError(null);
    setStatusMessage(null);
    if (!campaignName.trim()) {
      setError('Campaign name is required.');
      return;
    }
    if (!channel) {
      setError('Select a channel.');
      return;
    }
    if (!selectedTemplateId) {
      setError('Select a template.');
      return;
    }
  const payload: CampaignCreatePayload = {
      name: campaignName,
      channel,
      template_id: selectedTemplateId,
      group_ids: groupIds,
      upload_contacts: uploadRows,
    };
    setSubmitting(true);
    try {
      const resp = await createCampaign(payload);
      setTargetCount(resp.target_count);
      setEstimatedCost(resp.estimated_cost);
      setStatusMessage('Campaign queued successfully.');
    } catch (e: any) {
      const msg = e?.response?.status === 401 ? 'Unauthorized. Please log in again.' : e?.response?.data?.detail || 'Failed to create campaign';
      setEstimatedCost(0);
      setTargetCount(0);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Campaign Send</h1>
        <p className="text-gray-600">Send bulk messages to multiple contacts</p>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200">{error}</div>}
      {statusMessage && <div className="p-3 bg-green-50 text-green-700 rounded border border-green-200">{statusMessage}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Setup */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input placeholder="e.g., November Newsletter" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableChannels.map((ch) => (
                      <SelectItem key={ch} value={ch}>
                        {channelLabel(ch)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {throttleLimit && (
                  <div className="text-xs text-gray-600">
                    Current throttle for {channelLabel(channel)}: {throttleLimit} messages per minute.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Contact Groups (multi-select)</Label>
                    <div className="flex flex-wrap gap-2">
                      {groups.map((g) => {
                        const active = groupIds.includes(g.id);
                        return (
                          <Button
                            key={g.id}
                            type="button"
                            size="sm"
                            variant={active ? "default" : "outline"}
                            onClick={() =>
                              setGroupIds((prev) =>
                                prev.includes(g.id) ? prev.filter((id) => id !== g.id) : [...prev, g.id],
                              )
                            }
                          >
                            {g.name}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600">Upload CSV (name,email,phone)</Label>
                    <input type="file" accept=".csv" onChange={(e) => e.target.files && handleUploadCsv(e.target.files[0])} />
                    {uploadRows.length > 0 && <div className="text-xs text-gray-600">{uploadRows.length} rows loaded</div>}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={selectedTemplateId ? String(selectedTemplateId) : ''} onValueChange={(val) => setSelectedTemplateId(Number(val))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateOptions.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variable Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-gray-600 mb-2">Sample preview (static placeholder demo):</div>
                {['{{first_name}}', '{{last_name}}', '{{full_name}}'].map((v, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-gray-900 mb-1">Sample Contact #{idx + 1}</div>
                    <div className="text-gray-600">
                      {templateOptions.find((t) => t.id === selectedTemplateId)?.body || ''} {v}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-blue-600">Target Count</div>
                  <div className="text-blue-900">{targetCount || '—'} contacts</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-green-600">Estimated Cost</div>
                  <div className="text-green-900">
                    {typeof estimatedCost === 'number' && isFinite(estimatedCost) ? `$${estimatedCost.toFixed(3)}` : '—'}
                  </div>
                </div>
              </div>
              {throttleLimit && (
                <div className="p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="text-xs text-gray-600">Throttle per minute</div>
                  <div className="text-sm text-gray-900">{channelLabel(channel)}: {throttleLimit}</div>
                </div>
              )}

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Channel:</span>
                  <span className="text-gray-900">{channel.toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Template:</span>
                  <span className="text-gray-900">
                    {templateOptions.find((t) => t.id === selectedTemplateId)?.name || '—'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Schedule:</span>
                  <span className="text-gray-900">Send Now</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg" onClick={handleStart} disabled={submitting}>
            <Send className="w-4 h-4 mr-2" />
            {submitting ? 'Queuing...' : 'Start Campaign'}
          </Button>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-yellow-900">
              Please review all details before sending. This action queues the campaign; it cannot be undone.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
