import uuid
import contextvars
from django.utils.deprecation import MiddlewareMixin

_request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")


def get_request_id() -> str:
    return _request_id_ctx.get()


class RequestIDMiddleware(MiddlewareMixin):
    """
    Middleware to attach a request_id to each request.
    Reuses incoming X-Request-ID if present, otherwise generates a UUID4.
    """

    def process_request(self, request):
        rid = request.META.get("HTTP_X_REQUEST_ID") or uuid.uuid4().hex
        _request_id_ctx.set(rid)
        request.request_id = rid

    def process_response(self, request, response):
        try:
            response["X-Request-ID"] = request.request_id
        except Exception:
            response["X-Request-ID"] = get_request_id()
        return response
