import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Upload, Send, Users, DollarSign } from 'lucide-react';
import { Progress } from '../ui/progress';

export function Campaign() {
  const [channel, setChannel] = useState('whatsapp');
  const [campaignStatus, setCampaignStatus] = useState<'setup' | 'running' | 'completed'>('setup');
  const [progress, setProgress] = useState(0);

  const startCampaign = () => {
    setCampaignStatus('running');
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);
      if (currentProgress >= 100) {
        clearInterval(interval);
        setCampaignStatus('completed');
      }
    }, 500);
  };

  if (campaignStatus === 'running' || campaignStatus === 'completed') {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2">Campaign Status</h1>
          <p className="text-gray-600">
            {campaignStatus === 'running' ? 'Your campaign is being sent...' : 'Campaign completed successfully!'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {campaignStatus === 'running' ? 'Sending Messages...' : 'Campaign Complete'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-gray-900">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-green-600 mb-1">Success</div>
                <div className="text-green-900">{Math.floor((progress / 100) * 147)}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-red-600 mb-1">Failed</div>
                <div className="text-red-900">{Math.floor((progress / 100) * 3)}</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-blue-600 mb-1">Total</div>
                <div className="text-blue-900">150</div>
              </div>
            </div>

            {campaignStatus === 'completed' && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-green-900">
                    Campaign sent successfully to 147 contacts. 3 messages failed.
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setCampaignStatus('setup')}>
                    Send Another Campaign
                  </Button>
                  <Button variant="outline">
                    View Detailed Report
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Campaign Send</h1>
        <p className="text-gray-600">Send bulk messages to multiple contacts</p>
      </div>

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
                <Input placeholder="e.g., November Newsletter" />
              </div>

              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select segment or upload list" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Active Contacts (150)</SelectItem>
                    <SelectItem value="vip">VIP Segment (45)</SelectItem>
                    <SelectItem value="newsletter">Newsletter Subscribers (230)</SelectItem>
                    <SelectItem value="upload">Upload Contact List</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Template</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Welcome Message</SelectItem>
                    <SelectItem value="2">Booking Confirmation</SelectItem>
                    <SelectItem value="3">Newsletter Template</SelectItem>
                    <SelectItem value="4">Promotional Offer</SelectItem>
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
                <div className="text-gray-600 mb-2">Sample preview for first 3 contacts:</div>
                {['John Smith', 'Sarah Johnson', 'Mike Brown'].map((name, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-gray-900 mb-1">{name}</div>
                    <div className="text-gray-600">
                      Hi {name}, thank you for being a valued customer...
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
                  <div className="text-blue-900">150 contacts</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-green-600">Estimated Cost</div>
                  <div className="text-green-900">$7.50</div>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Channel:</span>
                  <span className="text-gray-900">{channel.toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Template:</span>
                  <span className="text-gray-900">Selected</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Schedule:</span>
                  <span className="text-gray-900">Send Now</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg" onClick={startCampaign}>
            <Send className="w-4 h-4 mr-2" />
            Start Campaign
          </Button>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-yellow-900">
              Please review all details before sending. This action cannot be undone.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
