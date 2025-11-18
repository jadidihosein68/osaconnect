import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createOutboundMessage, getContacts, getOutboundMessages } from "../api/client";

export default function MessagingPage() {
  const { data: contacts } = useQuery({ queryKey: ["contacts"], queryFn: getContacts });
  const outbound = useQuery({ queryKey: ["outbound"], queryFn: getOutboundMessages });
  const queryClient = useQueryClient();
  const [message, setMessage] = useState({ contact_id: "", channel: "whatsapp", body: "" });

  const sendMutation = useMutation({
    mutationFn: createOutboundMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound"] });
      setMessage({ contact_id: "", channel: "whatsapp", body: "" });
    },
  });

  const submit = (e) => {
    e.preventDefault();
    if (!message.contact_id || !message.body) return;
    sendMutation.mutate(message);
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Outbound Messaging</h1>
        <p className="text-sm text-slate-600">Send transactional messages with safety checks.</p>
      </div>
      <form onSubmit={submit} className="bg-white border rounded-lg p-4 shadow-sm space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <label className="text-sm text-slate-700">
            Contact
            <select
              className="mt-1 w-full border rounded px-2 py-2"
              value={message.contact_id}
              onChange={(e) => setMessage((m) => ({ ...m, contact_id: e.target.value }))}
            >
              <option value="">Select contact</option>
              {contacts?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.status})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700">
            Channel
            <select
              className="mt-1 w-full border rounded px-2 py-2"
              value={message.channel}
              onChange={(e) => setMessage((m) => ({ ...m, channel: e.target.value }))}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="telegram">Telegram</option>
              <option value="instagram">Instagram</option>
            </select>
          </label>
        </div>
        <label className="text-sm text-slate-700 block">
          Message
          <textarea
            className="mt-1 w-full border rounded px-2 py-2 h-28"
            value={message.body}
            onChange={(e) => setMessage((m) => ({ ...m, body: e.target.value }))}
            placeholder="Hello {{name}}, thanks for contacting us."
          />
        </label>
        <button
          type="submit"
          className="bg-indigo-600 text-white px-3 py-2 rounded text-sm disabled:opacity-50"
          disabled={sendMutation.isLoading}
        >
          {sendMutation.isLoading ? "Sending…" : "Send message"}
        </button>
        {sendMutation.error && <p className="text-sm text-red-600">{sendMutation.error.message}</p>}
      </form>
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-slate-900">Recent outbound</h2>
        </div>
        <div className="divide-y text-sm">
          {outbound.data?.map((msg) => (
            <div key={msg.id} className="px-4 py-3 flex items-start gap-3">
              <div className="flex-1">
                <div className="font-medium text-slate-900">
                  {msg.contact.full_name} — {msg.channel}
                </div>
                <div className="text-slate-700 whitespace-pre-wrap">{msg.body}</div>
                <div className="text-xs text-slate-500">
                  Status: {msg.status} · Retries: {msg.retry_count}
                </div>
              </div>
            </div>
          ))}
          {outbound.data?.length === 0 && <p className="px-4 py-3 text-slate-600">No outbound messages yet.</p>}
        </div>
      </div>
    </section>
  );
}
