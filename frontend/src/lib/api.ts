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

export async function fetchBookings(): Promise<Booking[]> {
  const { data } = await api.get("/bookings/");
  return data;
}

export async function fetchMetrics(): Promise<Record<string, number>> {
  const { data } = await axios.get("/metrics/", {
    headers: orgId ? { "X-Org-ID": orgId } : {},
    ...(authToken ? { headers: { Authorization: `Bearer ${authToken}`, "X-Org-ID": orgId } } : {}),
  });
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
