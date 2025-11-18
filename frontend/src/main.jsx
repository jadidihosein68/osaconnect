import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./index.css";
import Dashboard from "./pages/Dashboard";
import ContactsPage from "./pages/ContactsPage";
import TemplatesPage from "./pages/TemplatesPage";
import MessagingPage from "./pages/MessagingPage";
import BookingsPage from "./pages/BookingsPage";
import AssistantPage from "./pages/AssistantPage";

const queryClient = new QueryClient();

const NavBar = () => (
  <nav className="bg-white shadow-sm mb-6">
    <div className="max-w-6xl mx-auto px-4 py-3 flex gap-4 text-sm font-medium text-slate-700">
      <Link to="/">Dashboard</Link>
      <Link to="/contacts">Contacts</Link>
      <Link to="/templates">Templates</Link>
      <Link to="/messaging">Messaging</Link>
      <Link to="/bookings">Bookings</Link>
      <Link to="/assistant">AI Assistant</Link>
    </div>
  </nav>
);

const AppShell = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 pb-12">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/messaging" element={<MessagingPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
        </Routes>
      </main>
    </QueryClientProvider>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>,
);
