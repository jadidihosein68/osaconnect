from __future__ import annotations

from django.conf import settings


class ContentSecurityPolicyMiddleware:
    """
    Adds a Content-Security-Policy header.
    - In DEBUG/dev: allows unsafe-eval/inline to avoid HMR and dev warnings.
    - In production: a stricter policy (no eval), permitting common asset types.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        # Only set CSP on HTML responses; APIs can ignore.
        content_type = response.get("Content-Type", "")
        if "text/html" not in content_type:
            return response

        is_docs = request.path.startswith("/api/docs/")

        if settings.DEBUG:
            # Relaxed for dev/HMR to suppress eval warnings from tooling.
            csp = (
                "default-src 'self' data: blob:; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:"
                + (" https://cdn.jsdelivr.net" if is_docs else "")
                + "; "
                "style-src 'self' 'unsafe-inline' data:"
                + (" https://cdn.jsdelivr.net" if is_docs else "")
                + "; "
                "img-src 'self' data: blob: "
                + ("https://cdn.jsdelivr.net " if is_docs else "")
                + "; "
                "connect-src 'self' ws://localhost:5173 http://localhost:5173 http://localhost:8000; "
                "font-src 'self' data:; "
                "frame-ancestors 'self'; "
            )
        else:
            # Stricter production policy, no eval. Allow jsdelivr only for docs pages.
            extra = " https://cdn.jsdelivr.net" if is_docs else ""
            csp = (
                "default-src 'self'; "
                "script-src 'self'"
                + extra
                + "; "
                "style-src 'self' 'unsafe-inline'"
                + extra
                + "; "
                "img-src 'self' data:"
                + extra
                + "; "
                "connect-src 'self'; "
                "font-src 'self' data:; "
                "frame-ancestors 'self'; "
                "object-src 'none'; "
                "base-uri 'self'; "
            )

        response["Content-Security-Policy"] = csp
        return response
