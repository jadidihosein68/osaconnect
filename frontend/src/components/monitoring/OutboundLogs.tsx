import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

export function OutboundLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const logs = [
    {
      id: '1',
      timestamp: '5 mins ago',
      channel: 'WhatsApp',
      contact: 'John Smith',
      status: 'delivered',
      message: 'Your booking has been confirmed for...',
      retries: 0,
    },
    {
      id: '2',
      timestamp: '15 mins ago',
      channel: 'Email',
      contact: 'Sarah Johnson',
      status: 'sent',
      message: 'Newsletter - November Edition',
      retries: 0,
    },
    {
      id: '3',
      timestamp: '1 hour ago',
      channel: 'WhatsApp',
      contact: 'Mike Brown',
      status: 'failed',
      message: 'Payment reminder for invoice #1234',
      retries: 2,
    },
    {
      id: '4',
      timestamp: '2 hours ago',
      channel: 'Telegram',
      contact: 'Emily Davis',
      status: 'read',
      message: 'Appointment reminder for tomorrow',
      retries: 0,
    },
    {
      id: '5',
      timestamp: '3 hours ago',
      channel: 'Email',
      contact: 'Robert Wilson',
      status: 'delivered',
      message: 'Thank you for your purchase',
      retries: 0,
    },
    {
      id: '6',
      timestamp: '5 hours ago',
      channel: 'WhatsApp',
      contact: 'Lisa Anderson',
      status: 'failed',
      message: 'Special offer just for you',
      retries: 3,
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'read':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'sent':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'read':
        return 'bg-green-500';
      case 'sent':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const viewLogDetail = (log: any) => {
    setSelectedLog({
      ...log,
      requestPayload: {
        to: '+15551234567',
        message: log.message,
        channel: log.channel.toLowerCase(),
        template_id: 'tmpl_123',
      },
      response: {
        status: 200,
        message_id: 'msg_xyz789',
        timestamp: '2024-11-18T14:30:00Z',
      },
      error: log.status === 'failed' ? 'Network timeout after 30s' : null,
      lifecycle: [
        { stage: 'sent', timestamp: '14:30:00', status: 'success' },
        { stage: 'delivered', timestamp: '14:30:05', status: log.status !== 'failed' ? 'success' : 'failed' },
        ...(log.status === 'read' ? [{ stage: 'read', timestamp: '14:35:12', status: 'success' }] : []),
      ]
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Outbound Logs</h1>
        <p className="text-gray-600">Track all outgoing messages</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
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
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Message Logs ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-600">{log.timestamp}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{log.channel}</Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-900">{log.contact}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <Badge className={`${getStatusColor(log.status)} text-white capitalize`}>
                          {log.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                      {log.message}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{log.retries}</td>
                    <td className="py-3 px-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewLogDetail(log)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Message Log Detail</DialogTitle>
                          </DialogHeader>
                          {selectedLog && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-gray-600 mb-1">Contact</div>
                                  <div className="text-gray-900">{selectedLog.contact}</div>
                                </div>
                                <div>
                                  <div className="text-gray-600 mb-1">Channel</div>
                                  <div className="text-gray-900">{selectedLog.channel}</div>
                                </div>
                                <div>
                                  <div className="text-gray-600 mb-1">Status</div>
                                  <Badge className={`${getStatusColor(selectedLog.status)} text-white capitalize`}>
                                    {selectedLog.status}
                                  </Badge>
                                </div>
                                <div>
                                  <div className="text-gray-600 mb-1">Retries</div>
                                  <div className="text-gray-900">{selectedLog.retries}</div>
                                </div>
                              </div>

                              <div>
                                <div className="text-gray-900 mb-2">Request Payload</div>
                                <pre className="bg-gray-900 text-green-400 p-3 rounded text-sm overflow-x-auto">
                                  {JSON.stringify(selectedLog.requestPayload, null, 2)}
                                </pre>
                              </div>

                              <div>
                                <div className="text-gray-900 mb-2">Response</div>
                                <pre className="bg-gray-900 text-green-400 p-3 rounded text-sm overflow-x-auto">
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
        </CardContent>
      </Card>
    </div>
  );
}
