import React from "react";
import { useQuery } from "@tanstack/react-query";

import { getTemplates } from "../api/client";

export default function TemplatesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["templates"], queryFn: getTemplates });

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Templates</h1>
        <p className="text-sm text-slate-600">Review omni-channel templates and personalization slots.</p>
      </div>
      {isLoading ? (
        <p>Loading templates…</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {data?.map((tpl) => (
            <article key={tpl.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="font-semibold text-slate-900">{tpl.name}</h2>
                  <p className="text-xs uppercase text-slate-500">{tpl.channel}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${tpl.approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {tpl.approved ? "Approved" : "Draft"}
                </span>
              </div>
              {tpl.subject && <p className="text-sm font-medium text-slate-800 mb-1">{tpl.subject}</p>}
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{tpl.body}</p>
              {tpl.variables?.length > 0 && (
                <p className="text-xs text-slate-500 mt-2">Variables: {tpl.variables.join(", ")}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
