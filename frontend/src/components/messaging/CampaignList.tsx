import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Campaign, fetchCampaigns } from '../../lib/api';
import { Users, Send, Mail, MessageSquare } from 'lucide-react';

const channelIcon = (ch: string) => {
  if (ch === 'email') return <Mail className="w-4 h-4 text-blue-600" />;
  if (ch === 'whatsapp') return <MessageSquare className="w-4 h-4 text-green-600" />;
  if (ch === 'telegram') return <Send className="w-4 h-4 text-indigo-600" />;
  if (ch === 'instagram') return <MessageSquare className="w-4 h-4 text-pink-600" />;
  return <MessageSquare className="w-4 h-4" />;
};

const statusClass = (s: string) => {
  const map: Record<string, string> = {
    queued: 'bg-yellow-100 text-yellow-700',
    sending: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    draft: 'bg-gray-100 text-gray-700',
  };
  return map[s] || 'bg-gray-100 text-gray-700';
};

export function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchCampaigns();
        setCampaigns(data);
      } catch (e) {
        console.error('Failed to load campaigns');
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchesChannel = channelFilter === 'all' || c.channel === channelFilter;
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesChannel && matchesStatus;
    });
  }, [campaigns, search, channelFilter, statusFilter]);

  if (campaigns.length === 0) {
    return (
      <div className="p-6 space-y-4 text-center">
        <div className="text-xl text-gray-900">No campaigns yet</div>
        <div className="text-gray-600">Create your first campaign to start messaging at scale.</div>
        <Button onClick={() => (window.location.href = '/messaging/campaign')}>Create Campaign</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-gray-900 mb-1">Campaigns</h1>
          <p className="text-gray-600 text-sm">Review recent campaigns and their performance.</p>
        </div>
        <Button onClick={() => (window.location.href = '/messaging/campaign/create')}>Create Campaign</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <Input placeholder="Search campaigns" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="telegram">Telegram</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="sending">Sending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((c) => {
          const target = c.target_count || 0;
          const pct = target ? Math.round((c.sent_count / target) * 100) : 0;
          const deliveredPct = target ? Math.round((c.delivered_count / target) * 100) : 0;
          const failedPct = target ? Math.round((c.failed_count / target) * 100) : 0;
          return (
            <Card key={c.id} className="h-full flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base text-gray-900">{c.name}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {channelIcon(c.channel)}
                    <span>{c.channel === 'email' ? 'Email (SendGrid)' : c.channel.charAt(0).toUpperCase() + c.channel.slice(1)}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${statusClass(c.status)}`}>{c.status}</span>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 text-sm">
                <div className="text-gray-600 flex items-center gap-2">
                  <Users className="w-4 h-4" /> {target} targets
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-green-50 rounded border border-green-100 text-green-800">Sent: {c.sent_count} ({pct}%)</div>
                  <div className="p-2 bg-blue-50 rounded border border-blue-100 text-blue-800">Delivered: {c.delivered_count} ({deliveredPct}%)</div>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200 text-gray-800">Read/Open: {c.read_count}</div>
                  <div className="p-2 bg-red-50 rounded border border-red-100 text-red-800">Failed: {c.failed_count} ({failedPct}%)</div>
                  <div className="p-2 bg-red-50 rounded border border-red-100 text-red-800">Unsub: {c.unsubscribed_count}</div>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200 text-gray-800">Cost: ${c.estimated_cost?.toFixed ? c.estimated_cost.toFixed(3) : c.estimated_cost}</div>
                </div>
                {c.throttle_per_minute && (
                  <div className="text-xs text-gray-600">Throttle: {c.throttle_per_minute} msgs/min</div>
                )}
                <Button variant="outline" size="sm" className="w-full" onClick={() => (window.location.href = `/messaging/campaign/${c.id}`)}>
                  View Details
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
