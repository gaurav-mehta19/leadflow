from enum import StrEnum

from sqlalchemy import Enum, MetaData
from sqlalchemy.orm import DeclarativeBase

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def string_enum[E: StrEnum](enum_class: type[E], length: int) -> Enum:
    return Enum(
        enum_class,
        native_enum=False,
        create_constraint=False,
        length=length,
        values_callable=lambda members: [member.value for member in members],
        validate_strings=True,
    )
