import re

from app.core.limits import NOTE_PREVIEW_LENGTH, PHONE_MAX_DIGITS, PHONE_MIN_DIGITS

_WHITESPACE = re.compile(r"\s+")
_PHONE_ALLOWED = re.compile(r"^\+?[\d\s().-]+$")
ELLIPSIS = "…"


def collapse_whitespace(value: str) -> str:
    return _WHITESPACE.sub(" ", value).strip()


def blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def note_preview(body: str, limit: int = NOTE_PREVIEW_LENGTH) -> str:
    collapsed = collapse_whitespace(body)
    if len(collapsed) <= limit:
        return collapsed
    cut = collapsed[: limit - len(ELLIPSIS)]
    boundary = cut.rfind(" ")
    if boundary >= limit // 2:
        cut = cut[:boundary]
    return f"{cut.rstrip(' ,.;:')}{ELLIPSIS}"


class InvalidPhoneError(ValueError):
    pass


def normalize_phone(raw: str) -> str:
    candidate = raw.strip()
    if not _PHONE_ALLOWED.fullmatch(candidate):
        raise InvalidPhoneError("Use digits, spaces, dashes, dots or brackets, with an optional +.")
    digits = re.sub(r"\D", "", candidate)
    if not PHONE_MIN_DIGITS <= len(digits) <= PHONE_MAX_DIGITS:
        raise InvalidPhoneError(
            f"Enter a phone number with {PHONE_MIN_DIGITS} to {PHONE_MAX_DIGITS} digits."
        )
    return f"+{digits}" if candidate.startswith("+") else digits
