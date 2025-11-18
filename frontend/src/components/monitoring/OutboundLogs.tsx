import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { fetchOutbound, OutboundMessage } from '../../lib/api';

export function OutboundLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [logs, setLogs] = useState<OutboundMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchOutbound();
        setLogs(data);
      } catch {
        setError('Failed to load outbound logs');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        const matchesStatus = statusFilter === 'all' ? true : log.status === statusFilter;
        const target = log.contact?.full_name || log.contact?.email || log.contact?.phone_whatsapp || '';
        const matchesSearch =
          target.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.body.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
      }),
    [logs, statusFilter, searchQuery],
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const viewLogDetail = (log: OutboundMessage) => {
    setSelectedLog({
      channel: log.channel,
      contact: log.contact?.full_name || log.contact?.email || log.contact?.phone_whatsapp || 'Unknown',
      status: log.status,
      retries: log.retry_count,
      message: log.body,
      requestPayload: {
        to: log.contact?.phone_whatsapp || log.contact?.email || log.contact?.telegram_chat_id || log.contact?.instagram_scoped_id,
        channel: log.channel,
        body: log.body,
      },
      response: {
        trace_id: log.trace_id,
        status: log.status,
      },
      error: log.error || null,
      lifecycle: [
        { stage: 'created', timestamp: log.created_at, status: 'success' },
        { stage: 'status', timestamp: log.updated_at, status: log.status === 'failed' ? 'failed' : 'success' },
      ],
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Outbound Logs</h1>
        <p className="text-gray-600">Track all outgoing messages</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="retrying">Retrying</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message Logs ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading logs...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-gray-600">Timestamp</th>
                    <th className="text-left py-3 px-4 text-gray-600">Channel</th>
                    <th className="text-left py-3 px-4 text-gray-600">Contact</th>
                    <th className="text-left py-3 px-4 text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-gray-600">Message</th>
                    <th className="text-left py-3 px-4 text-gray-600">Retries</th>
                    <th className="text-left py-3 px-4 text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-600">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{log.channel}</Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {log.contact?.full_name || log.contact?.email || log.contact?.phone_whatsapp || 'Unknown'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <Badge className={`${getStatusColor(log.status)} text-white capitalize`}>{log.status}</Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate">{log.body}</td>
                      <td className="py-3 px-4 text-gray-600">{log.retry_count}</td>
                      <td className="py-3 px-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => viewLogDetail(log)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Message Details</DialogTitle>
                            </DialogHeader>
                            {selectedLog && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-gray-500">Channel</div>
                                    <div className="text-gray-900">{selectedLog.channel}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">Contact</div>
                                    <div className="text-gray-900">{selectedLog.contact}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">Status</div>
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(selectedLog.status)}
                                      <Badge className={`${getStatusColor(selectedLog.status)} text-white capitalize`}>
                                        {selectedLog.status}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500">Retries</div>
                                    <div className="text-gray-900">{selectedLog.retries}</div>
                                  </div>
                                </div>

                                <div>
                                  <div className="text-gray-900 mb-2">Message</div>
                                  <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                                    <div className="text-gray-900">{selectedLog.message}</div>
                                  </div>
                                </div>

                                <div>
                                  <div className="text-gray-900 mb-2">Request Payload</div>
                                  <pre className="p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800">
                                    {JSON.stringify(selectedLog.requestPayload, null, 2)}
                                  </pre>
                                </div>

                                <div>
                                  <div className="text-gray-900 mb-2">Provider Response</div>
                                  <pre className="p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800">
                                    {JSON.stringify(selectedLog.response, null, 2)}
                                  </pre>
                                </div>

                                {selectedLog.error && (
                                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                                    <div className="text-red-900">Error</div>
                                    <div className="text-red-700">{selectedLog.error}</div>
                                  </div>
                                )}

                                <div>
                                  <div className="text-gray-900 mb-2">Message Lifecycle</div>
                                  <div className="space-y-2">
                                    {selectedLog.lifecycle.map((stage: any, index: number) => (
                                      <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                                        {stage.status === 'success' ? (
                                          <CheckCircle className="w-5 h-5 text-green-600" />
                                        ) : (
                                          <XCircle className="w-5 h-5 text-red-600" />
                                        )}
                                        <div className="flex-1">
                                          <div className="text-gray-900 capitalize">{stage.stage}</div>
                                          <div className="text-gray-600">{stage.timestamp}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
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
