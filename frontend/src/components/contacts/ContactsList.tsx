import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Plus, Eye } from 'lucide-react';
import { Badge } from '../ui/badge';
import { fetchContacts, Contact } from '../../lib/api';

interface ContactsListProps {
  onViewContact: (id: string) => void;
}

export function ContactsList({ onViewContact }: ContactsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchContacts();
        setContacts(data);
      } catch (e) {
        setError('Failed to load contacts');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(
    () =>
      contacts.filter((c) => {
        const matchesSearch =
          c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.email || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [contacts, searchQuery, statusFilter],
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500';
      case 'Unsubscribed':
        return 'bg-red-500';
      case 'Blocked':
        return 'bg-red-600';
      case 'Bounced':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Contacts</h1>
          <p className="text-gray-600">Manage all your contacts and their information</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Contact
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Contacts ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          {loading ? (
            <p>Loading...</p>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-600">Name</th>
                  <th className="text-left py-3 px-4 text-gray-600">Phone</th>
                  <th className="text-left py-3 px-4 text-gray-600">Email</th>
                  <th className="text-left py-3 px-4 text-gray-600">Telegram</th>
                  <th className="text-left py-3 px-4 text-gray-600">Instagram</th>
                  <th className="text-left py-3 px-4 text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-gray-600">Last Inbound</th>
                  <th className="text-left py-3 px-4 text-gray-600">Last Outbound</th>
                  <th className="text-left py-3 px-4 text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact) => (
                  <tr key={contact.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{contact.full_name}</td>
                    <td className="py-3 px-4 text-gray-600">{contact.phone_whatsapp || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{contact.email || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{contact.telegram_chat_id || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{contact.instagram_scoped_id || '-'}</td>
                    <td className="py-3 px-4">
                      <Badge className={`${getStatusColor(contact.status)} text-white`}>{contact.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{contact.last_inbound_at || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{contact.last_outbound_at || '-'}</td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewContact(String(contact.id))}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
