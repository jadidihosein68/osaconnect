import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { fetchProfile, updateProfile } from '../lib/api';

export function Profile() {
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchProfile();
        setUsername(data.username || '');
        setPhone(data.phone || '');
        setEmail(data.email || null);
        setRole(data.role || null);
        setAvatarUrl(data.avatar_url || null);
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const data = await updateProfile({ username, phone }, avatarFile || undefined);
      setUsername(data.username || '');
      setPhone(data.phone || '');
      setAvatarUrl(data.avatar_url || null);
      if (data.avatar_url) {
        localStorage.setItem('corbi_avatar', data.avatar_url);
      } else {
        localStorage.removeItem('corbi_avatar');
      }
      if (data.username) {
        localStorage.setItem('corbi_user', data.username);
      }
      setAvatarFile(null);
      setMessage('Profile updated');
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { avatarUrl: data.avatar_url, username: data.username, phone: data.phone } }));
    } catch {
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600">Manage your personal information</p>
        {message && <p className="text-green-600 text-sm">{message}</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border">
              {avatarFile ? (
                <img src={URL.createObjectURL(avatarFile)} alt="avatar preview" className="w-full h-full object-cover" />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-sm">No avatar</span>
              )}
            </div>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/png,image/jpeg"
                ref={fileRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) setAvatarFile(e.target.files[0]);
                }}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                Upload Avatar
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={username} readOnly />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email || ''} readOnly />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Input value={role || ''} readOnly />
          </div>

          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 ..." />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
