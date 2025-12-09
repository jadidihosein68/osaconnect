import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Upload, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { connectIntegration, disconnectIntegration, fetchIntegrations, fetchBranding, updateBranding, Integration, testIntegration, startGoogleIntegration } from '../../lib/api';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

export function Settings() {
  const [activeTab, setActiveTab] = useState('branding');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [errors, setErrors] = useState<string | null>(null);
    const [confirmDisconnect, setConfirmDisconnect] = useState<{ open: boolean; provider?: string }>({ open: false });
  const [branding, setBranding] = useState({
    company_name: '',
    address: '',
    phone: '',
    email: '',
    logo_url: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

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
        { key: 'from_email', label: 'From Email' },
        { key: 'to_email', label: 'To Email' },
      ],
    },
    telegram: {
      name: 'Telegram Bot',
      fields: [
        { key: 'token', label: 'Bot Token', type: 'password' },
        { key: 'chat_id', label: 'Chat ID' },
        { key: 'bot_username', label: 'Bot Username (@yourbot)' },
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
        { key: 'client_id', label: 'Client ID' },
        { key: 'client_secret', label: 'Client Secret', type: 'password' },
        { key: 'calendar_id', label: 'Calendar ID' },
        { key: 'organizer_email', label: 'Organizer Email (from)' },
        { key: 'target_email', label: 'Target Email (to)' },
      ],
    },
    elevenlabs: {
      name: 'ElevenLabs Voice Agent',
      fields: [
        { key: 'token', label: 'API Key', type: 'password' },
        { key: 'agent_id', label: 'Agent ID' },
        { key: 'agent_phone_number_id', label: 'Agent Phone Number ID' },
        { key: 'webhook_secret', label: 'Webhook Secret', type: 'password' },
        { key: 'test_to_number', label: 'Test To Number (+... )' },
      ],
    },
    openrouter: {
      name: 'OpenRouter Integration',
      fields: [{ key: 'token', label: 'API Key', type: 'password' }],
    },
  };

  const [formState, setFormState] = useState<Record<string, Record<string, string>>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrors(null);
      try {
        const data = await fetchIntegrations();
        setIntegrations(data);
        const b = await fetchBranding();
        setBranding({
          company_name: b.company_name || '',
          address: b.address || '',
          phone: b.phone || '',
          email: b.email || '',
          logo_url: b.logo_url || '',
        });
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
    const integration = integrations.find((i) => i.provider === provider);
    const entries = formState[provider] || {};
    if (provider === 'google_calendar') {
      const merged = {
        ...(integration?.extra || {}),
        ...entries,
      };
      const client_id = merged.client_id;
      const client_secret = merged.client_secret;
      const calendar_id = merged.calendar_id;
      const organizer_email = merged.organizer_email;
      if (!client_id || !client_secret || !organizer_email) {
        setLoading(false);
        setErrors('Client ID, Client Secret, and Organizer Email are required.');
        return;
      }
      try {
        const res = await startGoogleIntegration({
          client_id,
          client_secret,
          calendar_id,
          organizer_email,
        });
        if (res?.auth_url) {
          window.location.href = res.auth_url;
          return;
        }
        setMessage(res?.message || 'Follow the Google consent to finish connection.');
      } catch (e) {
        setErrors('Failed to start Google OAuth.');
      } finally {
        setLoading(false);
      }
      return;
    }
    const token = entries.token || '';
    if (!token) {
      setLoading(false);
      setErrors('Token is required to connect.');
      return;
    }
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
      setConfirmDisconnect({ open: false, provider: undefined });
    }
  };

  const handleTest = async (provider: string) => {
    setLoading(true);
    setMessage(null);
    setErrors(null);
    const integration = integrations.find((i) => i.provider === provider);
    const entries = formState[provider] || {};
    const mergedExtra =
      provider === 'google_calendar'
        ? { ...entries } // avoid sending redacted stored fields; backend will use stored tokens
        : { ...(integration?.extra || {}), ...entries };
    // Do not send token unless user provided it; backend will use stored secret
    const token = entries.token ? entries.token : undefined;
    delete mergedExtra.token;
    // If not connected and no token provided, block test
    if (provider === 'google_calendar' && !integration?.is_active) {
      setLoading(false);
      setErrors('Please connect Google Calendar via OAuth before testing.');
      return;
    }
    if (provider !== 'google_calendar' && !integration?.is_active && !token) {
      setLoading(false);
      setErrors('Token is required to test connection.');
      return;
    }
    try {
      const res = await testIntegration(provider, { ...(token ? { token } : {}), extra: mergedExtra });
      setMessage(res.message || 'Test succeeded.');

    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Test failed.';
      setErrors(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderIntegrationCard = (provider: string) => {
    const integration = integrations.find((i) => i.provider === provider);
    const cfg = providerConfig[provider];
    const status = integration?.is_active ? 'connected' : 'disconnected';
    const isElevenLabs = provider === 'elevenlabs';
    const isEditing = formState[provider]?.__editing || false;

    const setEditing = (editing: boolean) => {
      setFormState((prev) => ({
        ...prev,
        [provider]: { ...(prev[provider] || {}), __editing: editing },
      }));
    };

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
          {cfg.fields.map((field) => {
            const isTestField = field.key === 'test_to_number';
            const isCalendarTarget = provider === 'google_calendar' && field.key === 'target_email';
            const hideFields = status === 'connected' && !isEditing;
            const shouldHide = hideFields && (!isElevenLabs || !isTestField) && !isCalendarTarget;
            if (shouldHide) return null;
            return (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  type={field.type || 'text'}
                  value={(formState[provider]?.[field.key] ?? integration?.extra?.[field.key] ?? '') as string}
                  onChange={(e) => handleFieldChange(provider, field.key, e.target.value)}
                  disabled={hideFields && !isTestField && !isCalendarTarget}
                />
              </div>
            );
          })}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => handleTest(provider)} disabled={loading}>
              Test Connection
            </Button>
            {status === 'connected' ? (
              <>
                {isEditing ? (
                  <>
                    <Button onClick={() => { handleConnect(provider); setEditing(false); }} disabled={loading}>
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => { setFormState((prev) => ({ ...prev, [provider]: { ...(prev[provider] || {}), __editing: false } })); }} disabled={loading}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" onClick={() => setEditing(true)} disabled={loading}>
                    Edit
                  </Button>
                )}
                <Dialog
                  open={confirmDisconnect.open && confirmDisconnect.provider === provider}
                  onOpenChange={(open) => setConfirmDisconnect({ open, provider })}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmDisconnect({ open: true, provider })}
                      disabled={loading}
                    >
                      Disconnect
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Disconnect {cfg.name}?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600">
                      This will disable the integration for this organization. You can reconnect later.
                    </p>
                    <DialogFooter className="gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setConfirmDisconnect({ open: false, provider: undefined })}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => confirmDisconnect.provider && handleDisconnect(confirmDisconnect.provider)}
                        disabled={loading}
                      >
                        Yes, Disconnect
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
                <Input
                  value={branding.company_name}
                  onChange={(e) => setBranding((prev) => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Your company name"
                />
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={branding.address}
                  onChange={(e) => setBranding((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={branding.phone}
                    onChange={(e) => setBranding((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 ..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={branding.email}
                    onChange={(e) => setBranding((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@example.com"
                  />
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
                <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden border">
                  {logoFile ? (
                    <img src={URL.createObjectURL(logoFile)} alt="Preview" className="w-full h-full object-cover" />
                  ) : branding.logo_url ? (
                    <img src={branding.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <svg
                      className="w-14 h-14 text-gray-400"
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
                  )}
                </div>
                <div className="flex-1">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                    <p className="text-gray-500">PNG, JPG up to 5MB</p>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setLogoFile(e.target.files[0]);
                        }
                      }}
                      className="mt-3"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={() => fileInputRef.current?.click()}>
                Upload New Logo
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={async () => {
                setLoading(true);
                setMessage(null);
                setErrors(null);
                try {
                  const data = await updateBranding(branding, logoFile || undefined);
                  setBranding({
                    company_name: data.company_name || '',
                    address: data.address || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    logo_url: data.logo_url || '',
                  });
                  setLogoFile(null);
                  setMessage('Branding saved.');
                } catch {
                  setErrors('Failed to save branding.');
                } finally {
                  setLoading(false);
                }
              }}
            >
              Save Changes
            </Button>
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
