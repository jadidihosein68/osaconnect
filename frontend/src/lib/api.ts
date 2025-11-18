import axios from "axios";

export interface Membership {
  id: number;
  role: string;
  organization: {
    id: number;
    name: string;
    domain: string;
  };
}

export interface Contact {
  id: number;
  full_name: string;
  email?: string;
  phone_whatsapp?: string;
  telegram_chat_id?: string;
  instagram_scoped_id?: string;
  status: string;
  last_inbound_at?: string;
  last_outbound_at?: string;
}

export interface Template {
  id: number;
  name: string;
  channel: string;
  language: string;
  subject: string;
  body: string;
  variables: string[];
  approved: boolean;
}

export interface OutboundMessage {
  id: number;
  channel: string;
  body: string;
  status: string;
  retry_count: number;
  trace_id?: string;
  error?: string;
  created_at: string;
  updated_at: string;
  contact: Contact | null;
}

export interface InboundMessage {
  id: number;
  channel: string;
  payload: Record<string, unknown>;
  received_at: string;
  contact: Contact | null;
}

export interface Booking {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  contact: Contact | null;
  notes?: string;
  location?: string;
}

let authToken = "";
let orgId: number | null = null;

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  if (orgId) {
    config.headers = config.headers || {};
    config.headers["X-Org-ID"] = orgId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("corbi_token");
      localStorage.removeItem("corbi_org");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export function setAuth(token: string, organization?: number) {
  authToken = token;
  if (organization) orgId = organization;
}

export function setOrg(id: number) {
  orgId = id;
}

export async function login(username: string, password: string) {
  const { data } = await api.post("/auth/token/", { username, password });
  setAuth(data.access);
  return data;
}

export async function fetchMemberships(): Promise<Membership[]> {
  const { data } = await api.get("/memberships/");
  return data;
}

export async function fetchContacts(): Promise<Contact[]> {
  const { data } = await api.get("/contacts/");
  return data;
}

export async function fetchTemplates(): Promise<Template[]> {
  const { data } = await api.get("/templates/");
  return data;
}

export async function fetchOutbound(): Promise<OutboundMessage[]> {
  const { data } = await api.get("/outbound/");
  return data;
}

export async function fetchInbound(): Promise<InboundMessage[]> {
  const { data } = await api.get("/inbound/");
  return data;
}

export async function replyToInbound(id: number | string, payload: { channel?: string; body: string }) {
  const { data } = await api.post(`/inbound/${id}/reply/`, payload);
  return data;
}

export async function linkInboundContact(id: number | string, payload: { contact_id: number }) {
  const { data } = await api.post(`/inbound/${id}/link_contact/`, payload);
  return data;
}

export async function fetchBookings(): Promise<Booking[]> {
  const { data } = await api.get("/bookings/");
  return data;
}

export async function fetchMonitoringSummary(): Promise<{ totals: Record<string, number>; success_rate: number; average_response_ms: number | null }> {
  const { data } = await api.get("/monitoring/summary/");
  return data;
}

export async function fetchMetrics(): Promise<Record<string, number>> {
  const { data } = await api.get("/metrics/");
  return data;
}

export async function createBooking(payload: { contact_id: number; title: string; start_time: string; end_time: string; status?: string; notes?: string; location?: string }) {
  const { data } = await api.post("/bookings/", payload);
  return data;
}

export async function updateBooking(id: number, payload: Partial<{ title: string; start_time: string; end_time: string; status: string; notes: string; location: string }>) {
  const { data } = await api.patch(`/bookings/${id}/`, payload);
  return data;
}

export async function sendOutbound(payload: Partial<OutboundMessage> & { contact_id: number; channel: string; body: string }) {
  const { data } = await api.post("/outbound/", payload);
  return data;
}

export async function askAssistant(question: string) {
  const { data } = await api.post("/assistant/", { question });
  return data;
}

export async function fetchDashboard() {
  const [metrics, contacts, outbound, inbound, bookings] = await Promise.all([
    fetchMetrics(),
    fetchContacts(),
    fetchOutbound(),
    fetchInbound(),
    fetchBookings(),
  ]);
  return { metrics, contacts, outbound, inbound, bookings };
}

// Integrations
export interface Integration {
  id: number;
  provider: string;
  is_active: boolean;
  extra: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export async function fetchIntegrations(): Promise<Integration[]> {
  const { data } = await api.get("/integrations/");
  return data;
}

export async function connectIntegration(provider: string, payload: { token: string; extra?: Record<string, any> }) {
  const { data } = await api.post(`/integrations/${provider}/connect/`, payload);
  return data;
}

export async function disconnectIntegration(provider: string) {
  const { data } = await api.delete(`/integrations/${provider}/`);
  return data;
}
