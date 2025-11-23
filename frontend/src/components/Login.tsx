import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { login } from '../lib/api';

interface LoginProps {
  onLogin: (token: string, username: string, nextPath?: string) => void;
  loading?: boolean;
  memberships?: any[];
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();

  const next = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const candidate = params.get('next') || '';
    if (candidate && candidate.startsWith('/') && !candidate.startsWith('//') && !/^https?:/i.test(candidate)) {
      return candidate;
    }
    return null;
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const data = await login(username, password);
      onLogin(data.access, username, next || undefined);
    } catch (err) {
      setError('Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center">
              <svg
                className="w-10 h-10 text-white"
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
          </div>
          <CardTitle className="text-center">Welcome to Corbi</CardTitle>
          <CardDescription className="text-center">
            Smart Digital Assistant for messaging automation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Login'}
            </Button>
            <div className="flex gap-2 mt-2">
              <Button type="button" variant="outline" className="w-1/2" onClick={() => {
                const target = next ? encodeURIComponent(next) : '';
                window.location.href = `/auth/microsoft/start${next ? `?next=${target}` : ''}`;
              }}>
                Continue with Microsoft
              </Button>
              <Button type="button" variant="outline" className="w-1/2" onClick={() => {
                const target = next ? encodeURIComponent(next) : '';
                window.location.href = `/auth/google/start${next ? `?next=${target}` : ''}`;
              }}>
                Continue with Google
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
