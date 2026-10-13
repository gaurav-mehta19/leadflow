from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ProblemFieldError(BaseModel):
    field: str
    message: str


class Problem(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str
    title: str
    status: int
    detail: str
    instance: str
    request_id: str | None
    errors: list[ProblemFieldError]


class DuplicatePhoneProblem(Problem):
    existing_lead_id: UUID
    existing_lead_name: str
