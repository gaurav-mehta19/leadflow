from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.errors import BadRequestError
from app.core.limits import TIMEZONE_MAX_LENGTH


class InvalidTimezoneError(BadRequestError):
    default_type_slug = "invalid-timezone"
    default_title = "Invalid time zone"


def parse_timezone(name: str) -> ZoneInfo:
    candidate = name.strip()
    if not candidate or len(candidate) > TIMEZONE_MAX_LENGTH:
        raise InvalidTimezoneError("X-Timezone must be an IANA time zone such as Asia/Kolkata.")
    try:
        return ZoneInfo(candidate)
    except (ZoneInfoNotFoundError, ValueError) as error:
        raise InvalidTimezoneError(
            f"'{candidate}' is not a recognised IANA time zone, e.g. Asia/Kolkata."
        ) from error
