
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./router/AppShell";
import "./index.css";

// Draft.js expects globals that aren't present in the browser by default.
if (typeof globalThis !== "undefined") {
  const g: any = globalThis as any;
  if (typeof g.global === "undefined") g.global = globalThis;
  if (typeof g.process === "undefined") g.process = { env: { NODE_ENV: "development" } };
}

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/*" element={<AppShell />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
  
