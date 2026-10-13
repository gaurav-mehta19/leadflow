import base64
import binascii
import json
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.core.errors import BadRequestError
from app.core.limits import CURSOR_MAX_LENGTH


class InvalidCursorError(BadRequestError):
    default_type_slug = "invalid-cursor"
    default_title = "Invalid cursor"


@dataclass(frozen=True, slots=True)
class Keyset:
    at: datetime
    id: UUID


def encode_cursor(keyset: Keyset) -> str:
    payload = json.dumps([keyset.at.isoformat(), str(keyset.id)], separators=(",", ":"))
    return base64.urlsafe_b64encode(payload.encode()).decode().rstrip("=")


def decode_cursor(cursor: str) -> Keyset:
    message = "The cursor is malformed. Use next_cursor from a previous page."
    if not cursor or len(cursor) > CURSOR_MAX_LENGTH:
        raise InvalidCursorError(message)
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        raw_at, raw_id = json.loads(base64.urlsafe_b64decode(padded.encode()))
        at = datetime.fromisoformat(raw_at)
        keyset = Keyset(at=at, id=UUID(raw_id))
    except (binascii.Error, ValueError, TypeError, UnicodeDecodeError) as error:
        raise InvalidCursorError(message) from error
    if keyset.at.tzinfo is None:
        raise InvalidCursorError(message)
    return keyset
