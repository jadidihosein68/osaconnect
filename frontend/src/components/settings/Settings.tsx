import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Upload, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { connectIntegration, disconnectIntegration, fetchIntegrations, Integration, testIntegration } from '../../lib/api';

export function Settings() {
  const [activeTab, setActiveTab] = useState('branding');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string | null>(null);

  const providerConfig: Record<
    string,
    { name: string; fields: { key: string; label: string; type?: string }[] }
  > = {
    whatsapp: {
      name: 'WhatsApp Business (Twilio)',
      fields: [
        { key: 'token', label: 'Auth Token', type: 'password' },
        { key: 'account_sid', label: 'Account SID' },
        { key: 'from_whatsapp', label: 'From WhatsApp (+...)' },
        { key: 'to_whatsapp', label: 'To WhatsApp (+...)' },
      ],
    },
    sendgrid: {
      name: 'Email Provider (SendGrid)',
      fields: [
        { key: 'token', label: 'API Key', type: 'password' },
        { key: 'sender_email', label: 'Sender Email' },
        { key: 'sender_name', label: 'Sender Name' },
      ],
    },
    telegram: {
      name: 'Telegram Bot',
      fields: [
        { key: 'token', label: 'Bot Token', type: 'password' },
        { key: 'bot_username', label: 'Bot Username' },
      ],
    },
    instagram: {
      name: 'Instagram Messaging',
      fields: [
        { key: 'token', label: 'Access Token', type: 'password' },
        { key: 'instagram_scoped_id', label: 'Instagram Scoped ID' },
      ],
    },
    google_calendar: {
      name: 'Calendar Integration (Google)',
      fields: [
        { key: 'token', label: 'OAuth Token', type: 'password' },
        { key: 'calendar_id', label: 'Calendar ID' },
      ],
    },
  };

  const [formState, setFormState] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrors(null);
      try {
        const data = await fetchIntegrations();
        setIntegrations(data);
      } catch {
        setErrors('Failed to load integrations.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleFieldChange = (provider: string, key: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [provider]: { ...(prev[provider] || {}), [key]: value },
    }));
  };

  const handleConnect = async (provider: string) => {
    setLoading(true);
    setMessage(null);
    setErrors(null);
    const entries = formState[provider] || {};
    const token = entries.token || '';
    const extra = { ...entries };
    delete extra.token;
    try {
      const res = await connectIntegration(provider, { token, extra });
      setMessage(res.message || 'Connected');
      // refresh list
      const updated = await fetchIntegrations();
      setIntegrations(updated);
    } catch (e) {
      setErrors('Failed to connect integration.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    setLoading(true);
    setMessage(null);
    setErrors(null);
    try {
      const res = await disconnectIntegration(provider);
      setMessage(res.message || 'Disconnected');
      const updated = await fetchIntegrations();
      setIntegrations(updated);
    } catch {
      setErrors('Failed to disconnect.');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (provider: string) => {
    setLoading(true);
    setMessage(null);
    setErrors(null);
    const entries = formState[provider] || {};
    const token = entries.token || '';
    const extra = { ...entries };
    delete extra.token;
    if (!token) {
      setErrors('Token is required to test connection.');
      setLoading(false);
      return;
    }
    try {
      const res = await testIntegration(provider, { token, extra });
      setMessage(res.message || 'Test succeeded.');
    } catch {
      setErrors('Test failed.');
    } finally {
      setLoading(false);
    }
  };

  const renderIntegrationCard = (provider: string) => {
    const integration = integrations.find((i) => i.provider === provider);
    const cfg = providerConfig[provider];
    const status = integration?.is_active ? 'connected' : 'disconnected';
    return (
      <Card key={provider}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>{cfg.name}</CardTitle>
              <Badge className={`${status === 'connected' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                {status === 'connected' ? (
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {cfg.fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label>{field.label}</Label>
              <Input
                type={field.type || 'text'}
                value={(formState[provider]?.[field.key] ?? integration?.extra?.[field.key] ?? '') as string}
                onChange={(e) => handleFieldChange(provider, field.key, e.target.value)}
              />
            </div>
          ))}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => handleTest(provider)} disabled={loading}>
              Test Connection
            </Button>
            {status === 'connected' ? (
              <>
                <Button onClick={() => handleConnect(provider)} disabled={loading}>
                  Save Changes
                </Button>
                <Button variant="destructive" onClick={() => handleDisconnect(provider)} disabled={loading}>
                  Disconnect
                </Button>
              </>
            ) : (
              <Button onClick={() => handleConnect(provider)} disabled={loading}>
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and integrations</p>
        {message && <p className="text-green-600 text-sm mt-1">{message}</p>}
        {errors && <p className="text-red-600 text-sm mt-1">{errors}</p>}
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
          {loading && integrations.length === 0 ? <p>Loading integrations...</p> : null}
          {Object.keys(providerConfig).map((provider) => renderIntegrationCard(provider))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
