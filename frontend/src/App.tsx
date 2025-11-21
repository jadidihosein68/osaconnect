import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { ContactsList } from './components/contacts/ContactsList';
import { ContactDetail } from './components/contacts/ContactDetail';
import { SendMessage } from './components/messaging/SendMessage';
import { Campaign } from './components/messaging/Campaign';
import { InboundLogs } from './components/inbound/InboundLogs';
import { InboundDetail } from './components/inbound/InboundDetail';
import { TemplateList } from './components/templates/TemplateList';
import { TemplateEditor } from './components/templates/TemplateEditor';
import { AIAssistant } from './components/ai/AIAssistant';
import { BookingList } from './components/bookings/BookingList';
import { BookingDetail } from './components/bookings/BookingDetail';
import { OutboundLogs } from './components/monitoring/OutboundLogs';
import { MonitoringDashboard } from './components/monitoring/MonitoringDashboard';
import { Settings } from './components/settings/Settings';
import { Billing } from './components/billing/Billing';
import { GroupsPage } from './components/contacts/GroupsPage';
import { EmailLogs } from './components/messaging/EmailLogs';
import { EmailJobDetail } from './components/messaging/EmailJobDetail';
import { TelegramOnboarding } from './components/messaging/TelegramOnboarding';
import { Layout } from './components/Layout';
import { fetchMemberships, setAuth, setOrg, Membership } from './lib/api';

interface AppProps {
  onAuthPersist?: (token: string, orgId?: number) => void;
  onOrgPersist?: (orgId: number) => void;
}

export default function App({ onAuthPersist, onOrgPersist }: AppProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [loadingMemberships, setLoadingMemberships] = useState(false);
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const deriveUserFromMembership = (membership?: Membership) => {
    if (!membership || !membership.user) return { name: null as string | null, email: null as string | null };
    const { first_name, last_name, username, email } = membership.user as any;
    const fullName = [first_name, last_name].filter(Boolean).join(' ').trim();
    return {
      name: fullName || username || email || null,
      email: email || null,
    };
  };

  const handleLogin = async (token: string, username: string) => {
    setAuth(token);
    onAuthPersist?.(token);
    localStorage.setItem('corbi_token', token);
    localStorage.setItem('corbi_user', username);
    // email will be hydrated from memberships call below
    setUserName(username);
    setLoadingMemberships(true);
    try {
      const orgs = await fetchMemberships();
      setMemberships(orgs);
      if (orgs.length > 0) {
        const selectedOrg = orgs[0].organization.id;
        const userInfo = deriveUserFromMembership(orgs[0]);
        if (userInfo.name) setUserName(userInfo.name);
        if (userInfo.email) {
          setUserEmail(userInfo.email);
          localStorage.setItem('corbi_email', userInfo.email);
        }
        setOrgId(selectedOrg);
        setOrg(selectedOrg);
        onAuthPersist?.(token, selectedOrg);
        localStorage.setItem('corbi_org', String(selectedOrg));
      }
      setIsLoggedIn(true);
      navigate('/', { replace: true });
    } finally {
      setLoadingMemberships(false);
    }
  };

  const handleOrgChange = (org: number) => {
    setOrgId(org);
    setOrg(org);
    onOrgPersist?.(org);
  };

  useEffect(() => {
    const token = localStorage.getItem('corbi_token');
    const storedOrg = localStorage.getItem('corbi_org');
    const storedUser = localStorage.getItem('corbi_user');
    const storedEmail = localStorage.getItem('corbi_email');
    const hydrate = async () => {
      if (token) {
        setAuth(token);
        setIsLoggedIn(true);
        if (storedUser) setUserName(storedUser);
        if (storedEmail) setUserEmail(storedEmail);
        setLoadingMemberships(true);
        try {
          const orgs = await fetchMemberships();
          setMemberships(orgs);
          if (orgs.length > 0) {
            const userInfo = deriveUserFromMembership(orgs[0]);
            if (userInfo.name) setUserName(userInfo.name);
            if (userInfo.email) {
              setUserEmail(userInfo.email);
              localStorage.setItem('corbi_email', userInfo.email);
            }
          }
          const selectedOrg = storedOrg || (orgs[0]?.organization.id ? String(orgs[0].organization.id) : null);
          if (selectedOrg) {
            const orgNum = Number(selectedOrg);
            setOrgId(orgNum);
            setOrg(orgNum);
            onAuthPersist?.(token, orgNum);
            onOrgPersist?.(orgNum);
          }
        } catch {
          setIsLoggedIn(false);
        } finally {
          setLoadingMemberships(false);
        }
      }
      setReady(true);
    };
    hydrate();
  }, [onAuthPersist, onOrgPersist]);

  if (!ready) return null;
  if (!isLoggedIn && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  const handleContactSaved = (id: string) => {
    navigate(`/contacts/${id}`, { replace: true });
  };

  const ContactDetailPage = () => {
    const params = useParams();
    return (
      <ContactDetail
        contactId={params.id || null}
        onBack={() => navigate('/contacts')}
        onSaved={handleContactSaved}
      />
    );
  };

  const InboundDetailPage = () => {
    const params = useParams();
    return <InboundDetail inboundId={params.id || null} onBack={() => navigate('/inbound')} />;
  };

  const BookingDetailPage = () => {
    const params = useParams();
    return <BookingDetail bookingId={params.id || null} onBack={() => navigate('/bookings')} />;
  };

  const TemplateEditorWrapper = ({ onBack }: { onBack: () => void }) => {
    const params = useParams();
    return <TemplateEditor templateId={params.id || null} onBack={onBack} onSaved={() => navigate('/templates')} />;
  };

  return (
    <Layout 
      currentScreen={location.pathname}
      organizations={memberships.map((m) => m.organization)}
      currentOrgId={orgId}
      onOrgChange={handleOrgChange}
          onNavigate={(screen) => navigate(screen)}
          onLogout={() => {
            localStorage.removeItem('corbi_user');
            localStorage.removeItem('corbi_email');
            localStorage.removeItem('corbi_token');
            localStorage.removeItem('corbi_refresh');
            setUserEmail(null);
            setIsLoggedIn(false);
            navigate('/login', { replace: true });
          }}
          userName={userName || userEmail || 'User'}
          userEmail={userEmail || undefined}
        >
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} loading={loadingMemberships} memberships={memberships} />} />
        <Route path="/" element={<Dashboard onNavigate={(path) => navigate(path)} orgId={orgId} isLoggedIn={isLoggedIn} />} />
        <Route
          path="/contacts/all-contacts"
          element={
            <ContactsList
              onViewContact={(id) => navigate(`/contacts/${id}`)}
              onCreateContact={() => navigate('/contacts/new')}
            />
          }
        />
        <Route
          path="/contacts/new"
          element={<ContactDetail contactId="new" onBack={() => navigate('/contacts/all-contacts')} onSaved={handleContactSaved} />}
        />
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
        <Route path="/contacts/groups" element={<GroupsPage />} />
        <Route
          path="/templates"
          element={
            <TemplateList
              onCreateTemplate={() => navigate('/templates/new')}
              onEditTemplate={(id) => navigate(`/templates/${id}`)}
            />
          }
        />
        <Route
          path="/templates/new"
          element={<TemplateEditor templateId={null} onBack={() => navigate('/templates')} onSaved={() => navigate('/templates')} />}
        />
        <Route
          path="/templates/:id"
          element={<TemplateEditorWrapper onBack={() => navigate('/templates')} />}
        />
        <Route path="/messaging/send" element={<SendMessage />} />
        <Route path="/outbound-logs/email" element={<EmailLogs />} />
        <Route path="/outbound-logs/email/:id" element={<EmailJobDetail />} />
        <Route path="/contacts/telegram-onboarding" element={<TelegramOnboarding />} />
        <Route path="/messaging/campaign" element={<Campaign />} />
        <Route path="/inbound" element={<InboundLogs onViewDetail={(id) => navigate(`/inbound/${id}`)} />} />
        <Route path="/inbound/:id" element={<InboundDetailPage />} />
        <Route path="/bookings" element={<BookingList onViewBooking={(id) => navigate(`/bookings/${id}`)} onCreateBooking={() => navigate('/bookings/new')} />} />
        <Route path="/bookings/:id" element={<BookingDetailPage />} />
        <Route path="/assistant" element={<AIAssistant />} />
        <Route path="/monitoring/outbound" element={<OutboundLogs />} />
        <Route path="/monitoring" element={<MonitoringDashboard />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
