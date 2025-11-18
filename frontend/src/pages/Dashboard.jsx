import React from "react";
import { useQuery } from "@tanstack/react-query";

import { getContacts, getOutboundMessages, getInboundMessages, getBookings } from "../api/client";

const Stat = ({ label, value }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border">
    <div className="text-xs uppercase text-slate-500">{label}</div>
    <div className="text-2xl font-semibold text-slate-800">{value}</div>
  </div>
);

export default function Dashboard() {
  const contacts = useQuery({ queryKey: ["contacts"], queryFn: getContacts });
  const outbound = useQuery({ queryKey: ["outbound"], queryFn: getOutboundMessages });
  const inbound = useQuery({ queryKey: ["inbound"], queryFn: getInboundMessages });
  const bookings = useQuery({ queryKey: ["bookings"], queryFn: getBookings });
  const safeLength = (value) => (Array.isArray(value) ? value.length : 0);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">MVP Monitoring</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Contacts" value={safeLength(contacts.data) || "—"} />
        <Stat label="Outbound" value={safeLength(outbound.data) || "—"} />
        <Stat label="Inbound" value={safeLength(inbound.data) || "—"} />
        <Stat label="Bookings" value={safeLength(bookings.data) || "—"} />
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <p className="text-sm text-slate-700">
          This dashboard surfaces counts pulled from the API. Extend with charts and SLA metrics to meet the monitoring
          requirements in the PRD.
        </p>
      </div>
    </section>
  );
}
