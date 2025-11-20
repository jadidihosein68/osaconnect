import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Plus, Eye, Trash2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { fetchContacts, Contact, deleteContact, fetchContactGroups, ContactGroup } from '../../lib/api';

interface ContactsListProps {
  onViewContact: (id: string) => void;
  onCreateContact: () => void;
}

const PAGE_SIZE = 10;
const colorMap: Record<string, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#a855f7',
  teal: '#14b8a6',
  gray: '#9ca3af',
};

export function ContactsList({ onViewContact, onCreateContact }: ContactsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchContacts();
        setContacts(data);
        const groupData = await fetchContactGroups();
        setGroups(groupData);
      } catch (e) {
        setError('Failed to load contacts');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, groupFilter]);

  const filtered = useMemo(
    () =>
      contacts.filter((c) => {
        const matchesSearch =
          c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.email || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter;
        const groupIds = (c.groups as any)?.map((g: any) => (typeof g === 'number' ? g : g.id)) || [];
        const matchesGroup = groupFilter === 'all' ? true : groupIds.includes(Number(groupFilter));
        return matchesSearch && matchesStatus && matchesGroup;
      }),
    [contacts, searchQuery, statusFilter, groupFilter],
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500';
      case 'unsubscribed':
        return 'bg-red-500';
      case 'blocked':
        return 'bg-red-600';
      case 'bounced':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this contact?')) return;
    setDeletingId(id);
    try {
      await deleteContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError('Failed to delete contact');
    } finally {
      setDeletingId(null);
    }
  };

  const formatStatus = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Contacts</h1>
          <p className="text-gray-600">Manage all your contacts and their information</p>
        </div>
        <Button onClick={onCreateContact}>
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
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
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
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-gray-600">Name</th>
                      <th className="text-left py-3 px-4 text-gray-600">Phone</th>
                      <th className="text-left py-3 px-4 text-gray-600">Email</th>
                      <th className="text-left py-3 px-4 text-gray-600">Telegram</th>
                      <th className="text-left py-3 px-4 text-gray-600">Groups</th>
                      <th className="text-left py-3 px-4 text-gray-600">Instagram</th>
                      <th className="text-left py-3 px-4 text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 text-gray-600">Last Inbound</th>
                      <th className="text-left py-3 px-4 text-gray-600">Last Outbound</th>
                      <th className="text-left py-3 px-4 text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((contact) => (
                      <tr key={contact.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-900">{contact.full_name}</td>
                        <td className="py-3 px-4 text-gray-600">{contact.phone_whatsapp || '-'}</td>
                        <td className="py-3 px-4 text-gray-600">{contact.email || '-'}</td>
                        <td className="py-3 px-4 text-gray-600">{contact.telegram_chat_id || '-'}</td>
                        <td className="py-3 px-4 text-gray-600">
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              const groupObjs =
                                (contact.groups as any)?.map((g: any) =>
                                  typeof g === 'number' ? groups.find((gg) => gg.id === g) || { id: g, name: `Group ${g}` } : g,
                                ) || [];
                              if (groupObjs.length === 0) return <span className="text-gray-400">-</span>;
                              const display = groupObjs.slice(0, 3);
                              return (
                                <>
                                  {display.map((g: any) => (
                                    <span
                                      key={g.id}
                                      className="px-2 py-1 text-xs rounded-full border"
                                      style={{ borderColor: colorMap[g.color || 'gray'] || '#d1d5db', color: '#111827' }}
                                    >
                                      {g.name}
                                    </span>
                                  ))}
                                  {groupObjs.length > 3 && (
                                    <span className="text-xs text-gray-500">+{groupObjs.length - 3} more</span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{contact.instagram_scoped_id || '-'}</td>
                        <td className="py-3 px-4">
                          <Badge className={`${getStatusColor(contact.status)} text-white`}>
                            {formatStatus(contact.status)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{contact.last_inbound_at || '-'}</td>
                        <td className="py-3 px-4 text-gray-600">{contact.last_outbound_at || '-'}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => onViewContact(String(contact.id))}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(contact.id)}
                              disabled={deletingId === contact.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
