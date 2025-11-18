import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';

interface TemplateEditorProps {
  templateId: string | null;
  onBack: () => void;
}

export function TemplateEditor({ templateId, onBack }: TemplateEditorProps) {
  const [templateName, setTemplateName] = useState(templateId ? 'Booking Confirmation' : '');
  const [channel, setChannel] = useState('whatsapp');
  const [messageBody, setMessageBody] = useState(
    templateId ? 'Hi {name},\n\nYour booking has been confirmed for {date} at {time}.\n\nThank you for choosing our services!' : ''
  );
  const [variables, setVariables] = useState(
    templateId ? [
      { name: 'name', fallback: 'Customer' },
      { name: 'date', fallback: 'TBD' },
      { name: 'time', fallback: 'TBD' }
    ] : []
  );

  const addVariable = () => {
    setVariables([...variables, { name: '', fallback: '' }]);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const updateVariable = (index: number, field: 'name' | 'fallback', value: string) => {
    const newVariables = [...variables];
    newVariables[index][field] = value;
    setVariables(newVariables);
  };

  const getPreview = () => {
    let preview = messageBody;
    variables.forEach(variable => {
      if (variable.name) {
        preview = preview.replace(
          new RegExp(`\\{${variable.name}\\}`, 'g'),
          variable.fallback || `{${variable.name}}`
        );
      }
    });
    return preview;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-gray-900 mb-1">
              {templateId ? 'Edit Template' : 'Create Template'}
            </h1>
            <p className="text-gray-600">Design your message template</p>
          </div>
        </div>
        <Button>
          <Save className="w-4 h-4 mr-2" />
          Save Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Editor */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  placeholder="e.g., Booking Confirmation"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message Body</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter your message template here. Use {variable_name} for dynamic content."
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={8}
              />
              <div className="mt-2 text-gray-600">
                Tip: Use curly braces to add variables, e.g., {'{name}'}, {'{date}'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Variables</CardTitle>
                <Button variant="outline" size="sm" onClick={addVariable}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Variable
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {variables.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No variables added yet. Click "Add Variable" to get started.
                </div>
              ) : (
                variables.map((variable, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Variable name (e.g., name)"
                        value={variable.name}
                        onChange={(e) => updateVariable(index, 'name', e.target.value)}
                      />
                      <Input
                        placeholder="Fallback value"
                        value={variable.fallback}
                        onChange={(e) => updateVariable(index, 'fallback', e.target.value)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVariable(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 min-h-[400px]">
                <div className="mb-4">
                  <Badge className="bg-green-100 text-green-700">
                    {channel.toUpperCase()}
                  </Badge>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="whitespace-pre-wrap text-gray-900">
                    {getPreview() || 'Your message preview will appear here...'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-gray-600 mb-1">Template Name</div>
                <div className="text-gray-900">{templateName || 'Not set'}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Channel</div>
                <div className="text-gray-900">{channel.toUpperCase()}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Variables Count</div>
                <div className="text-gray-900">{variables.length}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Message Length</div>
                <div className="text-gray-900">{messageBody.length} characters</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
