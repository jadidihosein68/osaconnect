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
  whatsapp_blocked?: boolean;
  telegram_chat_id?: string;
  telegram_status?: string;
  telegram_invited?: boolean;
  telegram_linked?: boolean;
  telegram_onboarded_at?: string | null;
  telegram_last_invite_at?: string | null;
  instagram_scoped_id?: string;
  status: string;
  notes?: string;
  segments?: string[];
  tags?: string[];
  last_inbound_at?: string;
  last_outbound_at?: string;
  groups?: number[] | ContactGroup[];
}

export interface TelegramMessage {
  id: number;
  contact: number;
  chat_id: string;
  direction: string;
  message_type: string;
  text: string;
  attachments: any[];
  telegram_message_id?: string;
  status?: string;
  created_at: string;
}

export interface WhatsAppMessage {
  id: number;
  contact: number;
  contact_name?: string;
  contact_phone?: string;
  direction: string;
  message_type: string;
  text: string;
  attachments: any[];
  twilio_message_sid?: string;
  status?: string;
  error_reason?: string;
  created_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  channel: string;
  template: number | null;
  template_name?: string;
  created_by?: number | null;
  created_by_name?: string;
  group_ids?: number[];
  upload_used?: boolean;
  target_count: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  unsubscribed_count: number;
  estimated_cost: number;
  status: string;
  created_at: string;
  throttle_per_minute?: number;
  recipients?: CampaignRecipient[];
}

export interface CampaignRecipient {
  id: number;
  contact_id: number;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_instagram_user_id?: string;
  status: string;
  error_reason?: string | null;
  error_message?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
}

export interface CampaignCreatePayload {
  name: string;
  channel: string;
  template_id?: number;
  group_ids?: number[];
  upload_contacts?: Array<{ name?: string; email?: string; phone?: string }>;
}

export interface CampaignCostConfig {
  default_currency: string;
  channels: {
    [key: string]: {
      currency: string;
      pricing: {
        outbound: { unit: string; amount: { actual: number; markup: number } | number };
        inbound?: { unit: string; amount: { actual: number; markup: number } | number };
        template?: any;
      };
    };
  };
}

export interface Notification {
  id: number;
  type: string;
  severity: string;
  title: string;
  body?: string;
  target_url?: string | null;
  data?: Record<string, any>;
  created_at: string;
}

export interface NotificationRecipient {
  id: number;
  read_at?: string | null;
  created_at: string;
  notification: Notification;
}

export interface Branding {
  company_name: string;
  address: string;
  phone: string;
  email: string;
  logo_url?: string | null;
}

export interface NotificationSummary {
  unread_count: number;
}

export interface ContactGroup {
  id: number;
  name: string;
  description?: string;
  color?: string;
  contacts_count?: number;
}

export interface Template {
  id: number;
  name: string;
  channel: string;
  language: string;
  subject: string;
  body: string;
  variables: any[];
  category?: string;
  footer?: string;
  is_default?: boolean;
  approved?: boolean;
  approved_by?: string;
  approved_at?: string;
  created_at?: string;
  updated_at?: string;
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

export interface BillingLog {
  id: number;
  timestamp: string;
  feature_tag: string;
  model: string;
  mode?: string;
  tokens_prompt?: number | null;
  tokens_completion?: number | null;
  tokens_total?: number | null;
  raw_cost?: number | null;
  billable_cost?: number | null;
  currency: string;
  request_id?: string;
  status: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface EmailJob {
  id: number;
  subject: string;
  body_html: string;
  body_text?: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  excluded_count: number;
  exclusions?: { contact_id?: number; email?: string; reason?: string }[];
  batch_config?: {
    batch_size: number;
    batch_delay_seconds: number;
    max_retries: number;
    retry_delay_seconds: number;
  };
  attachments: any[];
  created_at: string;
  started_at?: string;
  completed_at?: string;
  recipients?: EmailRecipient[];
  error?: string;
}

export interface EmailRecipient {
  id: number;
  contact?: Contact | null;
  email: string;
  full_name?: string;
  status: string;
  error?: string;
  sent_at?: string;
}

let authToken = localStorage.getItem("corbi_token") || "";
let refreshToken = localStorage.getItem("corbi_refresh") || "";
let orgId: number | null = localStorage.getItem("corbi_org") ? Number(localStorage.getItem("corbi_org")) : null;

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

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshToken) throw new Error("No refresh token available");
  if (refreshPromise) return refreshPromise;
  refreshPromise = api
    .post("/auth/token/refresh/", { refresh: refreshToken })
    .then(({ data }) => {
      const newAccess = data.access;
      authToken = newAccess;
      if (newAccess) {
        localStorage.setItem("corbi_token", newAccess);
      }
      return newAccess;
    })
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });
  return refreshPromise;
}

export function clearAuth() {
  authToken = "";
  refreshToken = "";
  orgId = null;
  localStorage.removeItem("corbi_token");
  localStorage.removeItem("corbi_refresh");
  localStorage.removeItem("corbi_org");
  localStorage.removeItem("corbi_user");
  localStorage.removeItem("corbi_email");
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("corbi_redirect");
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    const isExpired =
      error?.response?.status === 401 &&
      (error?.response?.data?.code === "token_not_valid" || /expired/i.test(error?.response?.data?.detail || ""));

    if (isExpired && refreshToken && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newAccess = await refreshAccessToken();
        if (newAccess) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        clearAuth();
        const redirect = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
        window.location.href = `/login?next=${encodeURIComponent(redirect)}`;
      }
    }
    if (status === 401) {
      clearAuth();
      if (typeof window !== "undefined") {
        const redirect = window.location.pathname + window.location.search;
        window.location.href = `/login?next=${encodeURIComponent(redirect)}`;
      }
      return Promise.reject(error);
    }
    return Promise.reject(error);
  },
);

export function setAuth(token: string, organization?: number, refresh?: string) {
  authToken = token;
  if (token) {
    localStorage.setItem("corbi_token", token);
  }
  if (refresh) {
    refreshToken = refresh;
    localStorage.setItem("corbi_refresh", refresh);
  }
  if (organization) orgId = organization;
}

export function setOrg(id: number) {
  orgId = id;
}

export async function login(username: string, password: string) {
  const { data } = await api.post("/auth/token/", { username, password });
  setAuth(data.access, undefined, data.refresh);
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

export async function fetchContact(id: number | string): Promise<Contact> {
  const { data } = await api.get(`/contacts/${id}/`);
  return data;
}

export async function fetchContactEngagements(id: number | string): Promise<any[]> {
  const { data } = await api.get(`/contacts/${id}/engagements/`);
  return data;
}

export type ContactPayload = Partial<{
  full_name: string;
  email: string;
  phone_whatsapp: string;
  telegram_chat_id: string;
  instagram_scoped_id: string;
  status: string;
  notes: string;
  segments: string[];
  tags: string[];
  groups: number[];
}>;

export async function createContact(payload: ContactPayload): Promise<Contact> {
  const { data } = await api.post("/contacts/", payload);
  return data;
}

export async function updateContact(id: number | string, payload: ContactPayload): Promise<Contact> {
  const { data } = await api.patch(`/contacts/${id}/`, payload);
  return data;
}

export async function deleteContact(id: number | string) {
  await api.delete(`/contacts/${id}/`);
}

// Telegram onboarding
export async function fetchTelegramOnboardingContacts(): Promise<Contact[]> {
  const { data } = await api.get("/telegram/onboarding/");
  return data;
}

export async function generateTelegramInviteLink(contactId: number): Promise<{ link: string }> {
  const { data } = await api.post(`/telegram/onboarding/${contactId}/invite_link/`);
  return data;
}

export async function sendTelegramInviteEmail(contactId: number): Promise<{ status: string; link: string }> {
  const { data } = await api.post(`/telegram/onboarding/${contactId}/invite_email/`);
  return data;
}

export async function fetchTelegramMessages(contactId: number): Promise<TelegramMessage[]> {
  const { data } = await api.get(`/telegram/messages/?contact_id=${contactId}`);
  return data;
}

export async function sendTelegramMessage(
  contactId: number,
  payload: { text?: string; attachment_id?: number; attachment_ids?: number[] },
): Promise<TelegramMessage | TelegramMessage[]> {
  const { data } = await api.post(`/telegram/messages/`, { contact_id: contactId, ...payload });
  return data;
}

export async function fetchWhatsAppMessages(contactId: number): Promise<WhatsAppMessage[]> {
  const { data } = await api.get(`/whatsapp/messages/?contact_id=${contactId}`);
  return data;
}

export async function sendWhatsAppMessage(
  contactId: number,
  payload: { text?: string; attachment_ids?: number[] },
): Promise<WhatsAppMessage> {
  const { data } = await api.post(`/whatsapp/messages/`, { contact_id: contactId, ...payload });
  return data;
}

export async function fetchInstagramMessages(contactId: number): Promise<InstagramMessage[]> {
  const { data } = await api.get(`/instagram/messages/?contact_id=${contactId}`);
  return data;
}

export async function sendInstagramMessage(contactId: number, payload: { text: string }): Promise<InstagramMessage> {
  const { data } = await api.post(`/instagram/messages/`, { contact_id: contactId, ...payload });
  return data;
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const { data } = await api.get("/campaigns/");
  return data;
}

export async function fetchCampaign(id: number): Promise<Campaign> {
  const { data } = await api.get(`/campaigns/${id}/`);
  return data;
}

export async function createCampaign(payload: CampaignCreatePayload): Promise<Campaign> {
  const { data } = await api.post("/campaigns/", payload);
  return data;
}

export async function fetchCampaignThrottle(): Promise<{ default_limit: number; per_channel: Record<string, number> }> {
  const { data } = await api.get("/campaigns/throttle/");
  return data;
}

export async function fetchCampaignCosts(): Promise<CampaignCostConfig> {
  const { data } = await api.get("/campaigns/costs/");
  return data;
}

// Notifications
export async function fetchNotificationSummary(): Promise<NotificationSummary> {
  const { data } = await api.get("/notifications/summary/");
  return data;
}

export async function fetchNotifications(params?: {
  page?: number;
  page_size?: number;
  type?: string[] | string;
  severity?: string[] | string;
  read?: "true" | "false" | "all";
}): Promise<{ results: NotificationRecipient[]; count: number; page: number; page_size: number }> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.type) {
    const types = Array.isArray(params.type) ? params.type : [params.type];
    types.forEach((t) => query.append("type", t));
  }
  if (params?.severity) {
    const sev = Array.isArray(params.severity) ? params.severity : [params.severity];
    sev.forEach((s) => query.append("severity", s));
  }
  if (params?.read) query.set("read", params.read);
  const qs = query.toString() ? `?${query.toString()}` : "";
  const { data } = await api.get(`/notifications/${qs}`);
  return data;
}

export async function markNotificationRead(id: number, read = true) {
  const { data } = await api.post(`/notifications/${id}/read/`, { read });
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.post("/notifications/mark-all-read/");
  return data;
}

// Branding
export async function fetchBranding(): Promise<Branding> {
  const { data } = await api.get("/branding/");
  return data;
}

export async function updateBranding(payload: Branding, file?: File): Promise<Branding> {
  const form = new FormData();
  form.append("company_name", payload.company_name || "");
  form.append("address", payload.address || "");
  form.append("phone", payload.phone || "");
  form.append("email", payload.email || "");
  if (file) {
    form.append("logo", file);
  }
  const { data } = await api.post("/branding/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchTemplates(): Promise<Template[]> {
  const { data } = await api.get("/templates/");
  return data;
}

export async function fetchTemplate(id: number | string): Promise<Template> {
  const { data } = await api.get(`/templates/${id}/`);
  return data;
}

export interface TemplateVariable {
  name: string;
  fallback?: string;
}

export type TemplatePayload = {
  name: string;
  channel: string;
  language?: string;
  subject?: string;
  body: string;
  variables: TemplateVariable[];
  category?: string;
  footer?: string;
  is_default?: boolean;
  approved?: boolean;
  approved_by?: string;
  approved_at?: string;
};

export async function createTemplate(payload: TemplatePayload): Promise<Template> {
  const { data } = await api.post("/templates/", payload);
  return data;
}

export async function updateTemplate(id: number | string, payload: Partial<TemplatePayload>): Promise<Template> {
  const { data } = await api.patch(`/templates/${id}/`, payload);
  return data;
}

export async function deleteTemplate(id: number | string) {
  await api.delete(`/templates/${id}/`);
}

export async function approveTemplate(id: number | string): Promise<{ status: string; id: number }> {
  const { data } = await api.post(`/templates/${id}/approve/`);
  return data;
}

export async function fetchContactGroups(): Promise<ContactGroup[]> {
  const { data } = await api.get("/contact-groups/");
  return data;
}

export async function createContactGroup(payload: Partial<ContactGroup>): Promise<ContactGroup> {
  const { data } = await api.post("/contact-groups/", payload);
  return data;
}

export async function updateContactGroup(id: number | string, payload: Partial<ContactGroup>): Promise<ContactGroup> {
  const { data } = await api.patch(`/contact-groups/${id}/`, payload);
  return data;
}

export async function deleteContactGroup(id: number | string) {
  await api.delete(`/contact-groups/${id}/`);
}

export async function createEmailJob(payload: {
  subject: string;
  body_html: string;
  body_text?: string;
  contact_ids?: number[];
  group_ids?: number[];
  attachments?: any[];
  attachment_ids?: number[];
}): Promise<EmailJob> {
  const { data } = await api.post("/email-jobs/", payload);
  return data;
}

export async function fetchEmailJobs(): Promise<EmailJob[]> {
  const { data } = await api.get("/email-jobs/");
  return data;
}

export async function uploadEmailAttachment(file: File): Promise<{ id: number; filename: string; size: number; content_type: string }> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/email-attachments/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function uploadTelegramAttachment(file: File): Promise<{ id: number; filename: string; size: number; content_type: string }> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/telegram/attachments/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchEmailJob(id: number): Promise<EmailJob> {
  const { data } = await api.get(`/email-jobs/${id}/`);
  return data;
}

export async function retryEmailJob(id: number): Promise<{ status: string }> {
  const { data } = await api.post(`/email-jobs/${id}/retry_failed/`);
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

export async function fetchBillingLogs(): Promise<BillingLog[]> {
  const { data } = await api.get("/billing/logs/");
  return data;
}

export async function fetchMonitoringSummary(): Promise<{ totals: Record<string, number>; success_rate: number; average_response_ms: number | null }> {
  const { data } = await api.get("/monitoring/summary/");
  return data;
}

export async function fetchMonitoringDetails(): Promise<{
  per_channel: Record<string, { total: number; delivered: number; failed: number; success_rate: number }>;
  summary: { outbound: number; inbound: number; callback_errors: number; booking_failures: number; ai_failures: number; avg_callback_latency_ms: number };
  failure_reasons: Record<string, number>;
}> {
  const { data } = await api.get("/monitoring/details/");
  return data;
}

export async function fetchMonitoringEvents(limit = 50) {
  const { data } = await api.get(`/monitoring/events/?limit=${limit}`);
  return data;
}

export async function fetchMonitoringAlerts(limit = 20) {
  const { data } = await api.get(`/monitoring/alerts/?limit=${limit}`);
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

export async function testIntegration(provider: string, payload: { token: string; extra?: Record<string, any> }) {
  const { data } = await api.post(`/integrations/${provider}/test/`, payload);
  return data;
}
