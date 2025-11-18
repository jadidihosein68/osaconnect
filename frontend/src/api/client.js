import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
});

export async function getContacts() {
  const { data } = await api.get("/contacts/");
  return data;
}

export async function getTemplates() {
  const { data } = await api.get("/templates/");
  return data;
}

export async function getOutboundMessages() {
  const { data } = await api.get("/outbound/");
  return data;
}

export async function getInboundMessages() {
  const { data } = await api.get("/inbound/");
  return data;
}

export async function getBookings() {
  const { data } = await api.get("/bookings/");
  return data;
}

export async function createOutboundMessage(payload) {
  const { data } = await api.post("/outbound/", payload);
  return data;
}

export async function askAssistant(question) {
  const { data } = await api.post("/assistant/", { question });
  return data;
}
