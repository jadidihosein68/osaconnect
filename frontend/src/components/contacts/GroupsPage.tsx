import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { ContactGroup, createContactGroup, deleteContactGroup, fetchContactGroups, updateContactGroup } from '../../lib/api';

const COLORS = [
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'orange', label: 'Orange' },
  { value: 'purple', label: 'Purple' },
  { value: 'teal', label: 'Teal' },
  { value: 'gray', label: 'Gray' },
];

export function GroupsPage() {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContactGroup | null>(null);
  const [form, setForm] = useState({ name: '', description: '', color: '' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchContactGroups();
      setGroups(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Group name is required');
      return;
    }
    try {
      if (editing) {
        const updated = await updateContactGroup(editing.id, form);
        setGroups((prev) => prev.map((g) => (g.id === editing.id ? updated : g)));
      } else {
        const created = await createContactGroup(form);
        setGroups((prev) => [created, ...prev]);
      }
      setDialogOpen(false);
      setEditing(null);
      setForm({ name: '', description: '', color: '' });
      setError(null);
    } catch (err: any) {
      const msg = err?.response?.data?.name?.[0] || err?.response?.data?.detail || 'Failed to save group';
      setError(msg);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete group "${name}"? This will only unassign contacts.`)) return;
    try {
      await deleteContactGroup(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
    } catch {
      setError('Failed to delete group');
    }
  };

  const startEdit = (group: ContactGroup) => {
    setEditing(group);
    setForm({ name: group.name, description: group.description || '', color: group.color || '' });
    setDialogOpen(true);
  };

  const filtered = useMemo(() => groups, [groups]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Groups</h1>
          <p className="text-gray-600">Manage contact groups for this organization</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setForm({ name: '', description: '', color: '' }); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Group' : 'Create Group'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Group Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select value={form.color || ''} onValueChange={(v) => setForm({ ...form, color: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colorMap[c.value] }} />
                          {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>{editing ? 'Save' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Groups ({groups.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-600">No groups yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Contacts</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>{group.name}</TableCell>
                    <TableCell>{group.description || '—'}</TableCell>
                    <TableCell>
                      {group.color ? (
                        <span
                          className="inline-block h-4 w-4 rounded-full"
                          style={{ backgroundColor: colorMap[group.color] || '#9ca3af' }}
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{group.contacts_count ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(group)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(group.id, group.name)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const colorMap: Record<string, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#a855f7',
  teal: '#14b8a6',
  gray: '#9ca3af',
};
