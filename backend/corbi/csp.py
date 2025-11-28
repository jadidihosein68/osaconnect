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

        if settings.DEBUG:
            # Relaxed for dev/HMR to suppress eval warnings from tooling.
            csp = (
                "default-src 'self' data: blob:; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; "
                "style-src 'self' 'unsafe-inline' data:; "
                "img-src 'self' data: blob:; "
                "connect-src 'self' ws://localhost:5173 http://localhost:5173 http://localhost:8000; "
                "font-src 'self' data:; "
                "frame-ancestors 'self'; "
            )
        else:
            # Stricter production policy, no eval.
            csp = (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; "
                "connect-src 'self'; "
                "font-src 'self' data:; "
                "frame-ancestors 'self'; "
                "object-src 'none'; "
                "base-uri 'self'; "
            )

        response["Content-Security-Policy"] = csp
        return response
