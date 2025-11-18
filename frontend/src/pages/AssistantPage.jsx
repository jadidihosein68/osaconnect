import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { askAssistant } from "../api/client";

export default function AssistantPage() {
  const [question, setQuestion] = useState("");
  const mutation = useMutation({ mutationFn: askAssistant });

  const submit = (e) => {
    e.preventDefault();
    if (!question) return;
    mutation.mutate(question);
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">AI Assistant</h1>
        <p className="text-sm text-slate-600">
          Questions are routed to the server which reads the knowledge base and responds with a stubbed answer. Plug in
          your preferred LLM provider for production.
        </p>
      </div>
      <form onSubmit={submit} className="bg-white border rounded-lg p-4 shadow-sm space-y-3">
        <label className="text-sm text-slate-700 block">
          Ask a question
          <textarea
            className="mt-1 w-full border rounded px-2 py-2 h-24"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="How do we handle opt-outs?"
          />
        </label>
        <button type="submit" className="bg-indigo-600 text-white px-3 py-2 rounded text-sm">
          Ask
        </button>
      </form>
      {mutation.data && (
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="text-xs uppercase text-slate-500">Answer</div>
          <p className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{mutation.data.answer}</p>
        </div>
      )}
    </section>
  );
}
