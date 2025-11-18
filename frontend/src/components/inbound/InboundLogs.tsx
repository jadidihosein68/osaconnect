import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Eye, Image, FileText } from 'lucide-react';
import { Badge } from '../ui/badge';
import { fetchInbound, InboundMessage } from '../../lib/api';

interface InboundLogsProps {
  onViewDetail: (id: string) => void;
}

export function InboundLogs({ onViewDetail }: InboundLogsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [logs, setLogs] = useState<InboundMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchInbound();
        setLogs(data);
      } catch {
        setError('Failed to load inbound messages');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        const matchesChannel = channelFilter === 'all' ? true : log.channel === channelFilter;
        const sender =
          log.contact?.full_name ||
          log.contact?.email ||
          log.contact?.phone_whatsapp ||
          (log.payload?.sender as string) ||
          '';
        const matchesSearch =
          sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
          JSON.stringify(log.payload || {}).toLowerCase().includes(searchQuery.toLowerCase());
        return matchesChannel && matchesSearch;
      }),
    [logs, channelFilter, searchQuery],
  );

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'WhatsApp':
        return 'bg-green-100 text-green-700';
      case 'Email':
        return 'bg-blue-100 text-blue-700';
      case 'Telegram':
        return 'bg-cyan-100 text-cyan-700';
      case 'Instagram':
        return 'bg-pink-100 text-pink-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'matched' ? 'bg-green-500' : 'bg-orange-500';
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Inbound Messages</h1>
        <p className="text-gray-600">View and manage all incoming messages</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Inbound Messages ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {loading ? (
            <p>Loading inbound...</p>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-600">Timestamp</th>
                  <th className="text-left py-3 px-4 text-gray-600">Channel</th>
                  <th className="text-left py-3 px-4 text-gray-600">Sender</th>
                  <th className="text-left py-3 px-4 text-gray-600">Message</th>
                  <th className="text-left py-3 px-4 text-gray-600">Media</th>
                  <th className="text-left py-3 px-4 text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-600">{new Date(log.received_at).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <Badge className={getChannelColor(log.channel)}>
                        {log.channel}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      {log.contact?.full_name || log.contact?.email || log.contact?.phone_whatsapp || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-md truncate">
                      {String(log.payload?.text || log.payload?.message || '')}
                    </td>
                    <td className="py-3 px-4">
                      {log.payload?.media_url && (
                        <Image className="w-4 h-4 text-gray-400" />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={`${getStatusColor(log.status)} text-white`}>
                        {log.status === 'matched' ? 'Matched' : 'New'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetail(log.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
