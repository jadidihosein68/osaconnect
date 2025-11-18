import React from "react";
import { useQuery } from "@tanstack/react-query";

import { getContacts } from "../api/client";

export default function ContactsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["contacts"], queryFn: getContacts });

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Contacts</h1>
        <p className="text-sm text-slate-600">Identity management with opt-out status and dedupe rules.</p>
      </div>
      {isLoading ? (
        <p>Loading contacts…</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">WhatsApp</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2">{c.full_name}</td>
                  <td className="px-3 py-2">{c.email || "—"}</td>
                  <td className="px-3 py-2">{c.phone_whatsapp || "—"}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700">{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
