import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import App from "../App";
import { setAuth, setOrg } from "../lib/api";

// Simple token/org persistence using localStorage
const TOKEN_KEY = "corbi_token";
const ORG_KEY = "corbi_org";

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const org = localStorage.getItem(ORG_KEY);
    if (token) {
      setAuth(token);
      if (org) setOrg(Number(org));
    } else if (location.pathname !== "/login") {
      const next = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?next=${next}`, { replace: true });
    }
    setReady(true);
  }, [location.pathname, navigate]);

  const handleAuthPersist = (token: string, orgId?: number) => {
    localStorage.setItem(TOKEN_KEY, token);
    setAuth(token, orgId);
    if (orgId) {
      localStorage.setItem(ORG_KEY, String(orgId));
    }
  };

  const handleOrgPersist = (orgId: number) => {
    localStorage.setItem(ORG_KEY, String(orgId));
    setOrg(orgId);
  };

  if (!ready) return null;

  return (
    <App
      onAuthPersist={handleAuthPersist}
      onOrgPersist={handleOrgPersist}
    />
  );
}
