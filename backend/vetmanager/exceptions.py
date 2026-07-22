import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            "error": {
                "code": exc.__class__.__name__,
                "message": _extract_message(response.data),
                "details": response.data if isinstance(response.data, dict) else None,
            }
        }
        return response

    logger.exception("Unhandled exception in %s", context["view"].__class__.__name__)
    return Response(
        {"error": {"code": "interal_error", "message": "Something went wrong."}},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def _extract_message(data):
    if isinstance(data, dict) and "detail" in data:
        return str(data["detail"])

    if isinstance(data, list) and data:
        return str(data[0])

    if isinstance(data, dict):
        first_key = next(iter(data))
        val = data[first_key]
        return str(val[0]) if isinstance(val, list) else str(val)
    return str(data)
