import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Plus, Edit } from 'lucide-react';

interface TemplateListProps {
  onCreateTemplate: () => void;
  onEditTemplate: (id: string) => void;
}

export function TemplateList({ onCreateTemplate, onEditTemplate }: TemplateListProps) {
  const templates = [
    {
      id: '1',
      name: 'Booking Confirmation',
      channel: 'WhatsApp',
      variables: ['name', 'date', 'time'],
      lastUpdated: '2 days ago',
    },
    {
      id: '2',
      name: 'Payment Reminder',
      channel: 'WhatsApp',
      variables: ['name', 'amount', 'due_date'],
      lastUpdated: '5 days ago',
    },
    {
      id: '3',
      name: 'Newsletter Template',
      channel: 'Email',
      variables: ['name', 'month'],
      lastUpdated: '1 week ago',
    },
    {
      id: '4',
      name: 'Welcome Message',
      channel: 'WhatsApp',
      variables: ['name'],
      lastUpdated: '2 weeks ago',
    },
    {
      id: '5',
      name: 'Appointment Reminder',
      channel: 'Telegram',
      variables: ['name', 'date', 'service'],
      lastUpdated: '3 weeks ago',
    },
    {
      id: '6',
      name: 'Follow-up Email',
      channel: 'Email',
      variables: ['name', 'service', 'feedback_link'],
      lastUpdated: '1 month ago',
    },
  ];

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Message Templates</h1>
          <p className="text-gray-600">Create and manage reusable message templates</p>
        </div>
        <Button onClick={onCreateTemplate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="mb-2">{template.name}</CardTitle>
                  <Badge className={getChannelColor(template.channel)}>
                    {template.channel}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEditTemplate(template.id)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-gray-600 mb-1">Variables</div>
                <div className="flex flex-wrap gap-1">
                  {template.variables.map((variable) => (
                    <Badge key={variable} variant="outline">
                      {`{${variable}}`}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="pt-3 border-t">
                <div className="text-gray-500">
                  Updated {template.lastUpdated}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
