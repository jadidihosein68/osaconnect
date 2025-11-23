
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import AppShell from "./router/AppShell";
import "./index.css";

// Draft.js expects globals that aren't present in the browser by default.
if (typeof globalThis !== "undefined") {
  const g: any = globalThis as any;
  if (typeof g.global === "undefined") g.global = globalThis;
  if (typeof g.process === "undefined") g.process = { env: { NODE_ENV: "development" } };
}

const router = createBrowserRouter(
  [
    { path: "/*", element: <AppShell /> },
    { path: "*", element: <Navigate to="/" replace /> },
  ],
  {
    future: { v7_startTransition: true, v7_relativeSplatPath: true },
  }
);

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
  
