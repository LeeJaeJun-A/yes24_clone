from pydantic import BaseModel


class CategoryOut(BaseModel):
    id: int
    code: str
    name_ko: str
    name_en: str | None = None
    parent_code: str | None = None
    depth: int
    display_order: int
    is_active: bool
    icon_url: str | None = None

    model_config = {"from_attributes": True}


class CategoryTreeOut(CategoryOut):
    children: list["CategoryTreeOut"] = []
