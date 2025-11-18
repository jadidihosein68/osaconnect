import React from "react";
import { useQuery } from "@tanstack/react-query";

import { getBookings } from "../api/client";

export default function BookingsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["bookings"], queryFn: getBookings });

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Bookings</h1>
        <p className="text-sm text-slate-600">Calendar automation and status tracking.</p>
      </div>
      {isLoading ? (
        <p>Loading bookings…</p>
      ) : (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Contact</th>
                <th className="px-3 py-2 text-left">Start</th>
                <th className="px-3 py-2 text-left">End</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-3 py-2">{b.title}</td>
                  <td className="px-3 py-2">{b.contact?.full_name || "—"}</td>
                  <td className="px-3 py-2">{new Date(b.start_time).toLocaleString()}</td>
                  <td className="px-3 py-2">{new Date(b.end_time).toLocaleString()}</td>
                  <td className="px-3 py-2">{b.status}</td>
                </tr>
              ))}
              {data?.length === 0 && (
                <tr>
                  <td className="px-3 py-2 text-slate-600" colSpan={5}>
                    No bookings created.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
