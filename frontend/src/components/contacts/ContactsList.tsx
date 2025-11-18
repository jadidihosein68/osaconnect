import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Plus, Eye } from 'lucide-react';
import { Badge } from '../ui/badge';

interface ContactsListProps {
  onViewContact: (id: string) => void;
}

export function ContactsList({ onViewContact }: ContactsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const contacts = [
    {
      id: '1',
      name: 'John Smith',
      phone: '+1 (555) 123-4567',
      email: 'john.smith@email.com',
      telegram: '@johnsmith',
      instagram: '@john_smith',
      status: 'Active',
      lastInbound: '2 hours ago',
      lastOutbound: '1 hour ago',
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      phone: '+1 (555) 234-5678',
      email: 'sarah.j@email.com',
      telegram: '@sarahj',
      instagram: '@sarahjohnson',
      status: 'Active',
      lastInbound: '5 hours ago',
      lastOutbound: '3 hours ago',
    },
    {
      id: '3',
      name: 'Mike Brown',
      phone: '+1 (555) 345-6789',
      email: 'mike.brown@email.com',
      telegram: '-',
      instagram: '@mikeb',
      status: 'Unsubscribed',
      lastInbound: '2 days ago',
      lastOutbound: '1 day ago',
    },
    {
      id: '4',
      name: 'Emily Davis',
      phone: '+1 (555) 456-7890',
      email: 'emily.davis@email.com',
      telegram: '@emilyd',
      instagram: '-',
      status: 'Active',
      lastInbound: '1 day ago',
      lastOutbound: '6 hours ago',
    },
    {
      id: '5',
      name: 'Robert Wilson',
      phone: '+1 (555) 567-8901',
      email: 'robert.w@email.com',
      telegram: '@robertw',
      instagram: '@robertwilson',
      status: 'Blocked',
      lastInbound: '3 days ago',
      lastOutbound: '2 days ago',
    },
    {
      id: '6',
      name: 'Lisa Anderson',
      phone: '+1 (555) 678-9012',
      email: 'lisa.anderson@email.com',
      telegram: '-',
      instagram: '@lisa_a',
      status: 'Bounced',
      lastInbound: '1 week ago',
      lastOutbound: '5 days ago',
    },
  ];

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
          <CardTitle>All Contacts ({contacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{contact.name}</td>
                    <td className="py-3 px-4 text-gray-600">{contact.phone}</td>
                    <td className="py-3 px-4 text-gray-600">{contact.email}</td>
                    <td className="py-3 px-4 text-gray-600">{contact.telegram}</td>
                    <td className="py-3 px-4 text-gray-600">{contact.instagram}</td>
                    <td className="py-3 px-4">
                      <Badge className={`${getStatusColor(contact.status)} text-white`}>
                        {contact.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{contact.lastInbound}</td>
                    <td className="py-3 px-4 text-gray-600">{contact.lastOutbound}</td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewContact(contact.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
