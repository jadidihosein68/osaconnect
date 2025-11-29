import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { login } from '../lib/api';
import { MessageSquare, Users, BarChart3, ShieldCheck, Zap } from 'lucide-react';

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

  const Feature = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
    <div className="flex gap-3 items-start">
      <div className="mt-1">{icon}</div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-white/80">{text}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2">
      <div
        className="min-h-screen text-white px-8 lg:px-12 py-16 lg:py-20 flex justify-center"
        style={{
          backgroundImage: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)',
        }}
      >
        <div className="w-full max-w-4xl space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm text-white/80">Smart Digital Assistant</div>
              <div className="text-lg font-semibold">Complete Campaign Management Platform</div>
            </div>
          </div>

          <p className="text-white/90 text-lg leading-relaxed max-w-xl">
            Streamline messaging workflows with multi-channel campaigns, real-time analytics, and enterprise-grade governance.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Uptime', value: '99.9%' },
              { label: 'Messages Sent', value: '10M+' },
              { label: 'Active Users', value: '500+' },
              { label: 'Avg Latency', value: '<100ms' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <div className="text-2xl font-semibold">{stat.value}</div>
                <div className="text-sm text-white/80">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm text-white/90">
            <Feature icon={<MessageSquare className="w-4 h-4" />} title="Multi-Channel Messaging" text="Email, WhatsApp, Telegram & Instagram in one platform." />
            <Feature icon={<Users className="w-4 h-4" />} title="Smart Contact Management" text="Organize contacts, groups, and segments with ease." />
            <Feature icon={<BarChart3 className="w-4 h-4" />} title="Real-Time Analytics" text="Track deliveries, opens, clicks, and performance." />
            <Feature icon={<ShieldCheck className="w-4 h-4" />} title="Governance & Compliance" text="Suppression lists and opt-out handling built-in." />
            <Feature icon={<Zap className="w-4 h-4" />} title="High Performance" text="Fast, multi-tenant, enterprise-ready delivery." />
          </div>
        </div>
      </div>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-slate-50 to-slate-100 px-6 py-16">
        <div className="flex items-center justify-center w-full">
          <Card className="w-full max-w-md shadow-xl overflow-hidden">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-center">Sign in to your account</CardTitle>
              <CardDescription className="text-center text-gray-600">
                Access campaigns, contacts, and analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="admin@test.com"
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
                <div className="flex gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-1/2 flex h-11 items-center justify-center gap-2 px-2"
                    onClick={() => {
                      const target = next ? encodeURIComponent(next) : '';
                      window.location.href = `/auth/microsoft/start${next ? `?next=${target}` : ''}`;
                    }}
                  >
                    <span className="text-lg">🪟</span>
                    <span>Continue with Microsoft</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-1/2 flex h-11 items-center justify-center gap-2 px-2"
                    onClick={() => {
                      const target = next ? encodeURIComponent(next) : '';
                      window.location.href = `/auth/google/start${next ? `?next=${target}` : ''}`;
                    }}
                  >
                    <span className="text-lg">🟢</span>
                    <span>Continue with Google</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
