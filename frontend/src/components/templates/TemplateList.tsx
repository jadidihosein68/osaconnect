import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Plus, Edit } from 'lucide-react';
import { fetchTemplates, Template } from '../../lib/api';

interface TemplateListProps {
  onCreateTemplate: () => void;
  onEditTemplate: (id: string) => void;
}

export function TemplateList({ onCreateTemplate, onEditTemplate }: TemplateListProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchTemplates();
        setTemplates(data);
      } catch {
        setError('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {loading ? (
        <p>Loading templates...</p>
      ) : (
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
                    onClick={() => onEditTemplate(String(template.id))}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-gray-600 mb-1">Variables</div>
                  <div className="flex flex-wrap gap-1">
                    {(template.variables || []).map((variable) => (
                      <Badge key={variable} variant="outline">
                        {`{${variable}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <div className="text-gray-500">
                    {template.approved ? 'Approved' : 'Draft'}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
