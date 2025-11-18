import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ArrowLeft, User, Plus } from 'lucide-react';

interface InboundDetailProps {
  inboundId: string | null;
  onBack: () => void;
}

export function InboundDetail({ inboundId, onBack }: InboundDetailProps) {
  const message = {
    id: inboundId || '1',
    timestamp: '2 mins ago',
    channel: 'WhatsApp',
    sender: 'John Smith',
    senderPhone: '+1 (555) 123-4567',
    message: 'Hi, I have a question about my booking. Can you help me reschedule it to next week?',
    status: 'matched',
    contactId: '1',
    rawPayload: {
      from: '+15551234567',
      to: '+15559876543',
      message_id: 'msg_abc123def456',
      timestamp: '2024-11-18T14:30:00Z',
      type: 'text',
      text: {
        body: 'Hi, I have a question about my booking. Can you help me reschedule it to next week?'
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-gray-900 mb-1">Inbound Message Detail</h1>
          <p className="text-gray-600">{message.timestamp}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Message Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Message Content</CardTitle>
                <Badge className="bg-green-100 text-green-700">
                  {message.channel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-900">{message.message}</p>
              </div>
            </CardContent>
          </Card>

          {/* Sender Information */}
          <Card>
            <CardHeader>
              <CardTitle>Sender Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-600 mb-1">Sender Name</div>
                  <div className="text-gray-900">{message.sender}</div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Phone Number</div>
                  <div className="text-gray-900">{message.senderPhone}</div>
                </div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Channel</div>
                <div className="text-gray-900">{message.channel}</div>
              </div>
            </CardContent>
          </Card>

          {/* Raw Payload */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Payload</CardTitle>
            </CardHeader>
            <CardContent>
              <details className="cursor-pointer">
                <summary className="text-gray-600 mb-2">Click to expand</summary>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                  {JSON.stringify(message.rawPayload, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Matched Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {message.status === 'matched' ? (
                <>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <User className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="text-green-900">{message.sender}</div>
                      <div className="text-green-600">Existing Contact</div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    View Contact Profile
                  </Button>
                  <Button variant="outline" className="w-full">
                    Send Reply
                  </Button>
                </>
              ) : (
                <>
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="text-orange-900">
                      No matching contact found
                    </div>
                  </div>
                  <Button className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Contact
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-gray-600 mb-1">Message ID</div>
                <div className="text-gray-900 break-all">msg_abc123def456</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Received At</div>
                <div className="text-gray-900">Nov 18, 2024 2:30 PM</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Status</div>
                <Badge className="bg-green-500 text-white">
                  {message.status === 'matched' ? 'Matched to Contact' : 'New Contact'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
