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
import LoginPage from "./pages/LoginPage";
import { AuthProvider, useAuth } from "./auth/useAuth.jsx";

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

const Authenticated = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center space-y-3">
        <p className="text-lg font-semibold text-slate-900">Authentication required</p>
        <p className="text-slate-600">Please log in to access Corbi.</p>
        <Link className="text-indigo-600 underline" to="/login">
          Go to login
        </Link>
      </div>
    );
  }
  return children;
};

const AppShell = () => (
  <BrowserRouter>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <NavBar />
        <main className="max-w-6xl mx-auto px-4 pb-12">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <Authenticated>
                  <Dashboard />
                </Authenticated>
              }
            />
            <Route
              path="/contacts"
              element={
                <Authenticated>
                  <ContactsPage />
                </Authenticated>
              }
            />
            <Route
              path="/templates"
              element={
                <Authenticated>
                  <TemplatesPage />
                </Authenticated>
              }
            />
            <Route
              path="/messaging"
              element={
                <Authenticated>
                  <MessagingPage />
                </Authenticated>
              }
            />
            <Route
              path="/bookings"
              element={
                <Authenticated>
                  <BookingsPage />
                </Authenticated>
              }
            />
            <Route
              path="/assistant"
              element={
                <Authenticated>
                  <AssistantPage />
                </Authenticated>
              }
            />
          </Routes>
        </main>
      </QueryClientProvider>
    </AuthProvider>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>,
);
