import pytest

from app.domain.text import (
    InvalidPhoneError,
    blank_to_none,
    collapse_whitespace,
    normalize_phone,
    note_preview,
)
from app.repositories.base import escape_like


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("+91 98765 43210", "+919876543210"),
        ("98765-43210", "9876543210"),
        ("(022) 2345.6789", "02223456789"),
        ("  +1 (212) 555-0100 ", "+12125550100"),
        ("1234567", "1234567"),
        ("123456789012345", "123456789012345"),
    ],
)
def test_normalize_phone_keeps_digits_and_leading_plus(raw: str, expected: str) -> None:
    assert normalize_phone(raw) == expected


@pytest.mark.parametrize("raw", ["123456", "1234567890123456", "98765abc10", "91+98765", ""])
def test_normalize_phone_rejects_invalid_numbers(raw: str) -> None:
    with pytest.raises(InvalidPhoneError):
        normalize_phone(raw)


def test_collapse_whitespace() -> None:
    assert collapse_whitespace("  Ananya \t\n  Iyer ") == "Ananya Iyer"


@pytest.mark.parametrize(
    ("raw", "expected"), [(None, None), ("", None), ("  ", None), (" a ", "a")]
)
def test_blank_to_none(raw: str | None, expected: str | None) -> None:
    assert blank_to_none(raw) == expected


def test_note_preview_collapses_whitespace() -> None:
    assert note_preview("Shared pricing.\n\nShe'll review   with her CFO.") == (
        "Shared pricing. She'll review with her CFO."
    )


def test_note_preview_truncates_on_a_word_boundary() -> None:
    preview = note_preview("word " * 100)

    assert len(preview) <= 160
    assert preview.endswith("…")
    assert preview.removesuffix("…").endswith("word")


def test_note_preview_keeps_short_text_untouched() -> None:
    assert note_preview("x" * 160) == "x" * 160


@pytest.mark.parametrize(
    ("term", "expected"),
    [
        ("ana", "%ana%"),
        ("100%", "%100\\%%"),
        ("a_b", "%a\\_b%"),
        ("back\\slash", "%back\\\\slash%"),
    ],
)
def test_escape_like(term: str, expected: str) -> None:
    assert escape_like(term) == expected
