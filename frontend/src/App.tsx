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
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (token: string) => {
    setAuth(token);
    onAuthPersist?.(token);
    localStorage.setItem('corbi_token', token);
    setLoadingMemberships(true);
    try {
      const orgs = await fetchMemberships();
      setMemberships(orgs);
      if (orgs.length > 0) {
        const selectedOrg = orgs[0].organization.id;
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
    const hydrate = async () => {
      if (token) {
        setAuth(token);
        setIsLoggedIn(true);
        setLoadingMemberships(true);
        try {
          const orgs = await fetchMemberships();
          setMemberships(orgs);
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

  return (
    <Layout 
      currentScreen={location.pathname}
      organizations={memberships.map((m) => m.organization)}
      currentOrgId={orgId}
      onOrgChange={handleOrgChange}
      onNavigate={(screen) => navigate(screen)}
      onLogout={() => {
        setIsLoggedIn(false);
        navigate('/login', { replace: true });
      }}
    >
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} loading={loadingMemberships} memberships={memberships} />} />
        <Route path="/" element={<Dashboard onNavigate={(path) => navigate(path)} orgId={orgId} isLoggedIn={isLoggedIn} />} />
        <Route
          path="/contacts"
          element={
            <ContactsList
              onViewContact={(id) => navigate(`/contacts/${id}`)}
              onCreateContact={() => navigate('/contacts/new')}
            />
          }
        />
        <Route
          path="/contacts/new"
          element={<ContactDetail contactId="new" onBack={() => navigate('/contacts')} onSaved={handleContactSaved} />}
        />
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
        <Route path="/templates" element={<TemplateList onCreateTemplate={() => navigate('/templates')} onEditTemplate={(id) => navigate(`/templates`)} />} />
        <Route path="/messaging/send" element={<SendMessage />} />
        <Route path="/messaging/campaign" element={<Campaign />} />
        <Route path="/inbound" element={<InboundLogs onViewDetail={(id) => navigate(`/inbound/${id}`)} />} />
        <Route path="/inbound/:id" element={<InboundDetailPage />} />
        <Route path="/bookings" element={<BookingList onViewBooking={(id) => navigate(`/bookings/${id}`)} onCreateBooking={() => navigate('/bookings/new')} />} />
        <Route path="/bookings/:id" element={<BookingDetailPage />} />
        <Route path="/assistant" element={<AIAssistant />} />
        <Route path="/monitoring/outbound" element={<OutboundLogs />} />
        <Route path="/monitoring" element={<MonitoringDashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
