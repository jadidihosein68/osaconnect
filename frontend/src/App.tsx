import { useState } from 'react';
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

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedInboundId, setSelectedInboundId] = useState<string | null>(null);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen);
    setSelectedContactId(null);
    setSelectedBookingId(null);
    setSelectedInboundId(null);
    setIsEditingTemplate(false);
    setSelectedTemplateId(null);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'contacts':
        return <ContactsList 
          onViewContact={(id) => {
            setSelectedContactId(id);
            setCurrentScreen('contact-detail');
          }}
        />;
      case 'contact-detail':
        return <ContactDetail 
          contactId={selectedContactId}
          onBack={() => setCurrentScreen('contacts')}
        />;
      case 'send-message':
        return <SendMessage />;
      case 'campaign':
        return <Campaign />;
      case 'inbound-logs':
        return <InboundLogs 
          onViewDetail={(id) => {
            setSelectedInboundId(id);
            setCurrentScreen('inbound-detail');
          }}
        />;
      case 'inbound-detail':
        return <InboundDetail 
          inboundId={selectedInboundId}
          onBack={() => setCurrentScreen('inbound-logs')}
        />;
      case 'templates':
        return <TemplateList 
          onCreateTemplate={() => {
            setIsEditingTemplate(true);
            setSelectedTemplateId(null);
            setCurrentScreen('template-editor');
          }}
          onEditTemplate={(id) => {
            setIsEditingTemplate(true);
            setSelectedTemplateId(id);
            setCurrentScreen('template-editor');
          }}
        />;
      case 'template-editor':
        return <TemplateEditor 
          templateId={selectedTemplateId}
          onBack={() => setCurrentScreen('templates')}
        />;
      case 'ai-assistant':
        return <AIAssistant />;
      case 'bookings':
        return <BookingList 
          onViewBooking={(id) => {
            setSelectedBookingId(id);
            setCurrentScreen('booking-detail');
          }}
          onCreateBooking={() => setCurrentScreen('booking-detail')}
        />;
      case 'booking-detail':
        return <BookingDetail 
          bookingId={selectedBookingId}
          onBack={() => setCurrentScreen('bookings')}
        />;
      case 'outbound-logs':
        return <OutboundLogs />;
      case 'monitoring':
        return <MonitoringDashboard />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout 
      currentScreen={currentScreen}
      onNavigate={handleNavigate}
      onLogout={() => setIsLoggedIn(false)}
    >
      {renderScreen()}
    </Layout>
  );
}
