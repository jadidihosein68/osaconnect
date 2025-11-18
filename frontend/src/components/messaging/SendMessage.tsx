import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Upload, Send } from 'lucide-react';

export function SendMessage() {
  const [channel, setChannel] = useState('whatsapp');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [variables, setVariables] = useState({ name: '', date: '', amount: '' });

  const templates = {
    whatsapp: ['Booking Confirmation', 'Payment Reminder', 'Welcome Message'],
    email: ['Newsletter Template', 'Invoice Template', 'Follow-up Email'],
    telegram: ['Notification Template', 'Update Message'],
    instagram: ['DM Template', 'Story Reply Template'],
  };

  const getTemplatePreview = () => {
    if (selectedTemplate === 'Booking Confirmation') {
      return `Hi ${variables.name || '{name}'},\n\nYour booking has been confirmed for ${variables.date || '{date}'}.\n\nThank you for choosing our services!`;
    }
    if (selectedTemplate === 'Payment Reminder') {
      return `Hello ${variables.name || '{name}'},\n\nThis is a reminder that your payment of $${variables.amount || '{amount}'} is due.\n\nPlease complete the payment at your earliest convenience.`;
    }
    return 'Select a template to see preview';
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Send Message</h1>
        <p className="text-gray-600">Send individual messages to your contacts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Form */}
        <Card>
          <CardHeader>
            <CardTitle>Message Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Label>Contact</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select a contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">John Smith</SelectItem>
                  <SelectItem value="2">Sarah Johnson</SelectItem>
                  <SelectItem value="3">Mike Brown</SelectItem>
                  <SelectItem value="4">Emily Davis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates[channel as keyof typeof templates].map((template) => (
                    <SelectItem key={template} value={template}>
                      {template}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="space-y-4 pt-4 border-t">
                <div className="text-gray-900">Template Variables</div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="Enter name"
                    value={variables.name}
                    onChange={(e) => setVariables({ ...variables, name: e.target.value })}
                  />
                </div>
                {selectedTemplate === 'Booking Confirmation' && (
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={variables.date}
                      onChange={(e) => setVariables({ ...variables, date: e.target.value })}
                    />
                  </div>
                )}
                {selectedTemplate === 'Payment Reminder' && (
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={variables.amount}
                      onChange={(e) => setVariables({ ...variables, amount: e.target.value })}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Attachments (Optional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                <p className="text-gray-500">PNG, JPG, PDF up to 10MB</p>
              </div>
            </div>

            <Button className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </CardContent>
        </Card>

        {/* Message Preview */}
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
                <div className="whitespace-pre-wrap text-gray-900">
                  {getTemplatePreview()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
