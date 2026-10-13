import base64
from datetime import UTC, datetime
from uuid import UUID

import pytest

from app.domain.cursor import InvalidCursorError, Keyset, decode_cursor, encode_cursor

KEYSET = Keyset(
    at=datetime(2026, 5, 4, 6, 30, 15, 123456, tzinfo=UTC),
    id=UUID("6f1c2a3b-4d5e-4f60-8a71-92b3c4d5e6f7"),
)


def test_cursor_round_trips() -> None:
    assert decode_cursor(encode_cursor(KEYSET)) == KEYSET


def test_cursor_is_url_safe_and_unpadded() -> None:
    cursor = encode_cursor(KEYSET)

    assert "=" not in cursor
    assert "+" not in cursor
    assert "/" not in cursor


def _encode(raw: str) -> str:
    return base64.urlsafe_b64encode(raw.encode()).decode()


@pytest.mark.parametrize(
    "cursor",
    [
        "",
        "not-base64!!",
        _encode("not json"),
        _encode('["2026-05-04T06:30:00+00:00"]'),
        _encode('["yesterday", "6f1c2a3b-4d5e-4f60-8a71-92b3c4d5e6f7"]'),
        _encode('["2026-05-04T06:30:00+00:00", "not-a-uuid"]'),
        _encode('["2026-05-04T06:30:00", "6f1c2a3b-4d5e-4f60-8a71-92b3c4d5e6f7"]'),
        "a" * 300,
    ],
)
def test_malformed_cursors_are_rejected(cursor: str) -> None:
    with pytest.raises(InvalidCursorError):
        decode_cursor(cursor)
