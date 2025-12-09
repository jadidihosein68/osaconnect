import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Separator } from '../ui/separator';
import { createApiKey, fetchApiKeys, regenerateApiKey, revokeApiKey, ApiKey } from '../../lib/api';

interface DevelopersProps {
  isAdmin?: boolean;
}

export function Developers({ isAdmin }: DevelopersProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopesText, setScopesText] = useState('');
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [keyModalValue, setKeyModalValue] = useState<string | null>(null);
  const [keyModalName, setKeyModalName] = useState<string | null>(null);

  const loadKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApiKeys();
      setKeys(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const scopesArray = useMemo(() => scopesText.split(',').map((s) => s.trim()).filter(Boolean), [scopesText]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const data = await createApiKey({ name: name.trim(), scopes: scopesArray });
      setKeys((prev) => [data, ...prev]);
      setName('');
      setScopesText('');
      setCreateOpen(false);
      if (data.plain_key) {
        setKeyModalValue(data.plain_key);
        setKeyModalName(data.name);
        setKeyModalOpen(true);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Unable to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      const data = await revokeApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Unable to revoke key');
    }
  };

  const handleRegenerate = async (id: number) => {
    try {
      const data = await regenerateApiKey(id);
      setKeys((prev) => prev.map((k) => (k.id === id ? data : k)));
      if (data.plain_key) {
        setKeyModalValue(data.plain_key);
        setKeyModalName(data.name);
        setKeyModalOpen(true);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Unable to regenerate key');
    }
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Developers</CardTitle>
            <CardDescription>API keys are only available to administrators.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Developers</CardTitle>
              <CardDescription>Manage API keys for your organization.</CardDescription>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>Create API Key</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ElevenLabs" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Scopes (comma separated, optional)</label>
                    <Input value={scopesText} onChange={(e) => setScopesText(e.target.value)} placeholder="read,write" />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-gray-600">Loading keys...</div>}
          {error && <div className="text-red-600 mb-2">{error}</div>}
          {!loading && keys.length === 0 && (
            <div className="text-gray-600">You have no API keys yet.</div>
          )}
          {!loading && keys.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {k.plain_key ? k.plain_key : k.masked_key}
                    </TableCell>
                    <TableCell>
                      <Badge variant={k.status === 'active' ? 'default' : 'secondary'}>{k.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {k.scopes && k.scopes.length > 0 ? k.scopes.join(', ') : '—'}
                    </TableCell>
                    <TableCell>{new Date(k.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleCopy(k.plain_key ? k.plain_key : k.masked_key)}>
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerate(k.id)}
                        disabled={k.status !== 'active' && k.status !== 'revoked' ? true : false}
                      >
                        Regenerate
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevoke(k.id)}
                        disabled={k.status === 'revoked'}
                      >
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={keyModalOpen} onOpenChange={setKeyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Store this API key</DialogTitle>
            <CardDescription>This key will not be shown again. Copy and store it securely.</CardDescription>
          </DialogHeader>
          <div className="mt-2 space-y-1">
            <div className="text-sm text-gray-700">Name: {keyModalName}</div>
            <div className="font-mono text-sm p-2 rounded border bg-gray-50 break-all">{keyModalValue}</div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setKeyModalOpen(false)}>
              Close
            </Button>
            <Button onClick={() => keyModalValue && handleCopy(keyModalValue)}>Copy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>Add the API key as `Authorization: Bearer &lt;key&gt;` to external calls.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
