import React from "react";
import { useQuery } from "@tanstack/react-query";

import { getContacts, getOutboundMessages, getInboundMessages, getBookings, getMetrics } from "../api/client";

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
  const metrics = useQuery({ queryKey: ["metrics"], queryFn: getMetrics });
  const safeLength = (value) => (Array.isArray(value) ? value.length : 0);

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">MVP Monitoring</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Contacts" value={safeLength(contacts.data) || metrics.data?.contacts || "—"} />
        <Stat label="Outbound" value={safeLength(outbound.data) || metrics.data?.outbound || "—"} />
        <Stat label="Inbound" value={safeLength(inbound.data) || metrics.data?.inbound || "—"} />
        <Stat label="Bookings" value={safeLength(bookings.data) || metrics.data?.bookings || "—"} />
      </div>
      {metrics.data && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Stat label="Failures" value={metrics.data.failed} />
          <Stat label="Retrying" value={metrics.data.retrying} />
        </div>
      )}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <p className="text-sm text-slate-700">
          This dashboard surfaces counts pulled from the API. Extend with charts and SLA metrics to meet the monitoring
          requirements in the PRD.
        </p>
      </div>
    </section>
  );
}
