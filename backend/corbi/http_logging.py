import logging
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from corbi.request_id import get_request_id


def _truncate(text: str, limit: int = 1024) -> str:
    if text is None:
        return ""
    if len(text) <= limit:
        return text
    return text[:limit] + "...(truncated)"


class HttpLoggingMiddleware(MiddlewareMixin):
    """
    Logs request/response bodies in DEV, and only errors in PROD, with request_id correlation.
    """

    logger = logging.getLogger(__name__)

    def process_request(self, request):
        if not settings.LOG_HTTP_BODIES:
            return None
        try:
            body = request.body.decode("utf-8", errors="ignore")
        except Exception:
            body = ""
        rid = get_request_id()
        if settings.DEBUG:
            self.logger.info(
                "http_request request_id=%s method=%s path=%s query=\"%s\" body=\"%s\" user=%s",
                rid,
                request.method,
                request.path,
                request.META.get("QUERY_STRING", ""),
                _truncate(body, 2048),
                getattr(request.user, "username", None),
            )
        return None

    def process_response(self, request, response):
        rid = getattr(request, "request_id", get_request_id())
        if not settings.LOG_HTTP_BODIES:
            return response

        status = getattr(response, "status_code", None)
        try:
            content = response.content.decode("utf-8", errors="ignore")
        except Exception:
            content = ""

        if settings.DEBUG:
            # log every response in DEV
            self.logger.info(
                "http_response request_id=%s method=%s path=%s status_code=%s body=\"%s\"",
                rid,
                getattr(request, "method", "?"),
                getattr(request, "path", "?"),
                status,
                _truncate(content, 2048),
            )
        else:
            # PROD: log only errors
            if status and status >= 400:
                self.logger.warning(
                    "api_error request_id=%s method=%s path=%s status_code=%s body_snippet=\"%s\"",
                    rid,
                    getattr(request, "method", "?"),
                    getattr(request, "path", "?"),
                    status,
                    _truncate(content, 512),
                )
        return response
