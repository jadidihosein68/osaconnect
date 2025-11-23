Feature: Preserve and Restore Original URL After Login

Stack: React SPA (frontend) + Django API (backend)
Future: Compatible with Azure Entra ID & Google SSO

1. Business Goal

When a user opens a protected React route directly, e.g.:

http://localhost:3000/messaging/campaign/8

and they are not logged in, the system must:

Redirect them to the React login page.

After successful login (password or SSO), send them back to the original route (/messaging/campaign/8).

Still enforce organization + authorization rules on the backend:

If user doesn’t belong to the right org or lacks permission, they must not see the data (Django returns 403 → React shows “Access denied”).

2. React Frontend Requirements
2.1 Route Guard for Protected Pages

Use React Router (v5 or v6, depending on current project) to wrap all protected routes with a RequireAuth (or similar) component.

Responsibilities of RequireAuth:

Check authentication state:

Either from a global auth context/store, or by calling /api/auth/me on initial load.

If user is authenticated:

Render the protected component.

If user is not authenticated:

Capture the current path + query string, e.g.:

/messaging/campaign/8?tab=details

Redirect to the login page:

/login?next=/messaging/campaign/8?tab=details

This must work when user:

Types a URL manually,

Clicks a deep link,

Refreshes the page on a protected route.

2.2 Login Page Behaviour (/login)

Responsibilities:

Read next from query string (e.g. /login?next=/messaging/campaign/8).

Provide:

Username/password login form (current flow).

Buttons for “Continue with Microsoft” and “Continue with Google” (SSO hooks, even if they are stubs for now).

After successful username/password login:

Validate the next value (see security rules below).

If valid → navigate(next).

If missing/invalid → navigate('/dashboard') (or your chosen default).

Validation rules for next in React:

Must start with /.

Must not contain a protocol (http://, https://).

Must not include another domain.

If any of these fail → ignore next and go to default route.

2.3 HTTP Client Interceptor (React)

If you’re using Axios, Fetch wrapper, etc., implement a global interceptor:

When any API call receives 401 Unauthorized from Django:

Capture the current React route (path + query).

Redirect to:

/login?next=<current_path_and_query>

This ensures:

If session expires while user is working, they are taken to login and brought back after re-authentication.

3. Django Backend Requirements
3.1 Authentication Endpoints

Provide POST /api/auth/login/:

Input: username/password.

Output: JSON + set session cookie or return token.

Do not handle redirects here (JSON only; redirects are React’s job).

Provide GET /api/auth/me:

Return:

Basic user info.

Organization / tenant info (if needed).

Maybe permissions/roles summary.

If no valid session/token → return 401.

React uses /api/auth/me to bootstrap auth state when the app loads.

3.2 Authorization and Org Enforcement

For all protected APIs (e.g. /api/campaigns/:id):

If user is not authenticated:

Return 401 Unauthorized (JSON).

If authenticated but not allowed (wrong org or insufficient role):

Return 403 Forbidden (JSON).

Do not return HTML redirects from Django for API views; just proper status codes.

This ensures:

Even after redirect-back, a user cannot access resources in other orgs or without permission.

4. Future SSO: Azure Entra ID & Google

The design must be ready for OAuth2/OIDC.

4.1 Frontend: SSO Buttons

On /login page:

For each SSO provider, have buttons like:

“Continue with Microsoft”

“Continue with Google”

When clicked:

The React app should:

Read next from URL.

Redirect browser to Django SSO start endpoints with next preserved:

/auth/microsoft/start?next=<encoded_next>

/auth/google/start?next=<encoded_next>

Later we can optimize this to use POST or session, but query is fine as long as backend sanitizes it.

4.2 Django: SSO Start & Callback Flow

SSO Start endpoints:

/auth/microsoft/start/

/auth/google/start/

Responsibilities:

Read next from query string.

Validate and store next in server-side session (or signed cookie).

Build OAuth2/OIDC redirect to Azure/Google including a state parameter to prevent CSRF.

Redirect browser to the respective IdP’s authorization URL.

SSO Callback endpoints:

/auth/microsoft/callback/

/auth/google/callback/

Responsibilities:

Validate state and the OAuth2/OIDC response.

Create/find Django user.

Log the user in (attach to session / issue token).

Retrieve next from session, validate it (same rules as frontend).

Redirect browser back to React with 302:

If next is valid:

302 Location: http://localhost:3000<next>

Else:

302 Location: http://localhost:3000/dashboard

React then boots, calls /api/auth/me, sees valid session, and renders the correct route.

Important: Do not trust next directly from IdP callback query. Only trust server-side session-stored next that you validated before starting the OAuth flow.

5. Security Requirements (Must-Haves)

No Open Redirects

Only allow redirects to internal paths starting with /.

Reject/ignore anything with :// or an external hostname.

Org & Permission Isolation

Django always enforces org/authorization checks.

React should handle 403 responses by showing “Access denied” or similar, never bypassing backend rules.

Session / Token Security

If using cookies:

Set HttpOnly, Secure (in production), and appropriate SameSite.

Give sessions a reasonable expiration and re-authentication strategy.

6. Implementation Tasks Summary (for Codex)

React:

Implement an AuthContext (or equivalent) and a RequireAuth wrapper for protected routes.

In RequireAuth, if user is not authenticated:

Redirect to /login?next=<current_path_and_query>.

Implement /login page:

Read and validate next.

After successful normal login → navigate to next or /dashboard.

Keep next when user clicks “Login with Microsoft/Google”.

Implement a global API client (Axios/fetch) interceptor:

On 401 → redirect to /login?next=<current_path_and_query>.

Add 403 handling UX:

Show “Access denied” page when APIs return 403.

Django:

Implement /api/auth/login/ (JSON-based).

Implement /api/auth/me to return user + org info, or 401.

Ensure all protected endpoints:

Return 401 when unauthenticated.

Return 403 when unauthorized by org/permissions.

Implement SSO skeleton:

/auth/microsoft/start/ and /auth/microsoft/callback/

/auth/google/start/ and /auth/google/callback/

Use session + state to carry and validate next.

Implement shared is_safe_redirect(path) helper in Django for SSO callbacks.