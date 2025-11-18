import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Upload, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '../ui/badge';

export function Settings() {
  const [activeTab, setActiveTab] = useState('branding');

  const integrations = [
    {
      id: 'whatsapp',
      name: 'WhatsApp Business API',
      status: 'connected',
      lastSync: '5 mins ago',
      fields: [
        { name: 'Phone Number ID', value: '1234567890' },
        { name: 'Business Account ID', value: 'abc123def456' },
        { name: 'Access Token', value: '••••••••••••' },
      ]
    },
    {
      id: 'email',
      name: 'Email Provider (SendGrid)',
      status: 'connected',
      lastSync: '10 mins ago',
      fields: [
        { name: 'API Key', value: '••••••••••••' },
        { name: 'Sender Email', value: 'noreply@corbi.com' },
        { name: 'Sender Name', value: 'Corbi Team' },
      ]
    },
    {
      id: 'telegram',
      name: 'Telegram Bot',
      status: 'disconnected',
      lastSync: 'Never',
      fields: [
        { name: 'Bot Token', value: '' },
        { name: 'Bot Username', value: '' },
      ]
    },
    {
      id: 'instagram',
      name: 'Instagram Messaging',
      status: 'disconnected',
      lastSync: 'Never',
      fields: [
        { name: 'App ID', value: '' },
        { name: 'App Secret', value: '' },
        { name: 'Access Token', value: '' },
      ]
    },
    {
      id: 'calendar',
      name: 'Calendar Integration (Google)',
      status: 'connected',
      lastSync: '1 hour ago',
      fields: [
        { name: 'Calendar ID', value: 'primary' },
        { name: 'OAuth Token', value: '••••••••••••' },
      ]
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and integrations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input defaultValue="Corbi Solutions Inc." />
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input defaultValue="123 Business Street, San Francisco, CA 94102" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input defaultValue="+1 (555) 123-4567" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input defaultValue="contact@corbi.com" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company Logo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-14 h-14 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                    <p className="text-gray-500">PNG, JPG up to 5MB</p>
                  </div>
                </div>
              </div>

              <Button>Upload New Logo</Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button size="lg">Save Changes</Button>
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          {integrations.map((integration) => (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle>{integration.name}</CardTitle>
                    <Badge className={`${
                      integration.status === 'connected' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-500 text-white'
                    }`}>
                      {integration.status === 'connected' ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Connected
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Disconnected
                        </>
                      )}
                    </Badge>
                  </div>
                  <div className="text-gray-500">
                    Last sync: {integration.lastSync}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {integration.fields.map((field, index) => (
                  <div key={index} className="space-y-2">
                    <Label>{field.name}</Label>
                    <Input 
                      defaultValue={field.value} 
                      type={field.name.toLowerCase().includes('token') || field.name.toLowerCase().includes('secret') || field.name.toLowerCase().includes('key') ? 'password' : 'text'}
                    />
                  </div>
                ))}

                <div className="flex gap-2 pt-4">
                  <Button variant="outline">Test Connection</Button>
                  {integration.status === 'connected' ? (
                    <>
                      <Button>Save Changes</Button>
                      <Button variant="destructive">Disconnect</Button>
                    </>
                  ) : (
                    <Button>Connect</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
