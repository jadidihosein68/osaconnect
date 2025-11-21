import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Contact, fetchTelegramOnboardingContacts, generateTelegramInviteLink, sendTelegramInviteEmail } from '../../lib/api';
import { Copy, Mail, RefreshCcw } from 'lucide-react';

const statusLabel: Record<string, string> = {
  invited: 'Invited',
  onboarded: 'Onboarded',
  blocked: 'Blocked',
  not_linked: 'Not Linked',
};

export function TelegramOnboarding() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTelegramOnboardingContacts();
      setContacts(data);
    } catch {
      setError('Failed to load contacts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch = c.full_name.toLowerCase().includes(search.toLowerCase()) || (c.email || '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || (c.telegram_status || 'not_linked') === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contacts, search, statusFilter]);

  const copyLink = async (id: number, name: string) => {
    try {
      const { link } = await generateTelegramInviteLink(id);
      await navigator.clipboard.writeText(link);
      setToast(`Telegram invite link copied for ${name}.`);
    } catch {
      setToast('Failed to generate link.');
    }
  };

  const sendEmail = async (id: number, name: string) => {
    try {
      await sendTelegramInviteEmail(id);
      setToast(`Invite email sent to ${name}.`);
      load();
    } catch {
      setToast('Failed to send invite email.');
    }
  };

  const statusBadge = (s?: string) => {
    const ss = s || 'not_linked';
    let cls = 'bg-gray-100 text-gray-700';
    if (ss === 'onboarded') cls = 'bg-green-100 text-green-700';
    else if (ss === 'invited') cls = 'bg-blue-100 text-blue-700';
    else if (ss === 'blocked') cls = 'bg-red-100 text-red-700';
    return <Badge className={cls}>{statusLabel[ss] || ss}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-1">Telegram Onboarding</h1>
          <p className="text-gray-600">Invite your contacts to connect their Telegram accounts with Corbi.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {toast && <div className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded">{toast}</div>}
      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Search</Label>
              <Input placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <select
                className="border rounded px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="not_linked">Not Linked</option>
                <option value="invited">Invited</option>
                <option value="onboarded">Onboarded</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border rounded bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Telegram Status</TableHead>
                  <TableHead>Onboarded At</TableHead>
                  <TableHead>Last Invite</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-4">No contacts found.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.full_name}</TableCell>
                      <TableCell>{c.email || '—'}</TableCell>
                      <TableCell>{c.phone_whatsapp || '—'}</TableCell>
                      <TableCell>{statusBadge(c.telegram_status)}</TableCell>
                      <TableCell>{c.telegram_onboarded_at ? new Date(c.telegram_onboarded_at).toLocaleString() : '—'}</TableCell>
                      <TableCell>{c.telegram_last_invite_at ? new Date(c.telegram_last_invite_at).toLocaleString() : '—'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="secondary" onClick={() => copyLink(c.id, c.full_name)}>
                          <Copy className="w-4 h-4 mr-1" /> Copy Link
                        </Button>
                        <Button size="sm" variant="default" onClick={() => sendEmail(c.id, c.full_name)}>
                          <Mail className="w-4 h-4 mr-1" /> Send Email
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
