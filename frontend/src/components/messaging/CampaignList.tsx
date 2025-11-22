import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Campaign, fetchCampaigns } from '../../lib/api';
import { Users, Send, Mail, MessageSquare, Search, Target } from 'lucide-react';

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
        <Button onClick={() => (window.location.href = '/messaging/campaign/create')}>Create Campaign</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Campaigns</h1>
          <p className="text-gray-600 ">Review recent campaigns and their performance.</p>
        </div>
        <Button className="bg-gray-900 text-white hover:bg-gray-800" onClick={() => (window.location.href = '/messaging/campaign/create')}>
          + Create Campaign
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <Input placeholder="Search campaigns" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="email">Email (SendGrid)</SelectItem>
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
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((c) => {
          const target = c.target_count || 0;
          const pct = target ? Math.round((c.sent_count / target) * 100) : 0;
          const deliveredPct = target ? Math.round((c.delivered_count / target) * 100) : 0;
          const failedPct = target ? Math.round((c.failed_count / target) * 100) : 0;
          const cost = typeof c.estimated_cost === 'number' ? c.estimated_cost : Number(c.estimated_cost || 0);
          return (
            <Card key={c.id} className="h-full flex flex-col hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base text-gray-900">{c.name}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap text-sm text-gray-600">
                      {channelIcon(c.channel)}
                      <Badge variant="secondary" className="text-xs">
                        {c.channel === 'email' ? 'Email (SendGrid)' : c.channel.charAt(0).toUpperCase() + c.channel.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <Badge className={statusClass(c.status)}>{c.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <Target className="w-4 h-4" /> {target || 0} targets
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-blue-50 rounded  border-blue-100 text-blue-800">
                    <div className="font-medium">Sent</div>
                    <div>{c.sent_count} ({pct}%)</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded  border-green-100 text-green-800">
                    <div className="font-medium">Delivered</div>
                    <div>{c.delivered_count} ({deliveredPct}%)</div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded  border-orange-100 text-orange-800">
                    <div className="font-medium">Read/Open</div>
                    <div>{c.read_count}</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded  border-red-100 text-red-800">
                    <div className="font-medium">Failed</div>
                    <div>{c.failed_count} ({failedPct}%)</div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-700 pt-3 border-t ">
                  
                  <span className="text-gray-500">Unsubscribed: {c.unsubscribed_count}</span>
                  <span className="text-gray-500">Cost: ${cost.toFixed ? cost.toFixed(4) : Number(cost || 0).toFixed(4)}</span>
                
                </div>
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
