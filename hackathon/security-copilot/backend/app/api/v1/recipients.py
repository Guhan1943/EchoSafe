from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_analyst
from app.core.exceptions import BadRequestException, NotFoundException
from app.database import get_db
from app.models.user import User
from app.repositories.client_recipient import ClientRecipientRepository
from app.schemas.client_recipient import (
    ClientRecipientCreate,
    ClientRecipientListResponse,
    ClientRecipientResponse,
    ClientRecipientUpdate,
)

router = APIRouter()


@router.get("/", response_model=ClientRecipientListResponse)
def list_client_recipients(
    active_only: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(require_analyst),
) -> ClientRecipientListResponse:
    """List customer/client email recipients for publishing."""
    repo = ClientRecipientRepository(db)
    items = repo.get_all(active_only=active_only)
    return ClientRecipientListResponse(
        items=[ClientRecipientResponse.model_validate(item) for item in items],
        total=len(items),
    )


@router.post("/", response_model=ClientRecipientResponse, status_code=201)
def create_client_recipient(
    body: ClientRecipientCreate,
    db: Session = Depends(get_db),
    analyst: User = Depends(require_analyst),
) -> ClientRecipientResponse:
    """Add a client email recipient."""
    repo = ClientRecipientRepository(db)
    existing = repo.get_by_email(str(body.email))
    if existing is not None:
        raise BadRequestException(detail=f"Recipient with email {body.email} already exists")

    recipient = repo.create({**body.model_dump(), "created_by": analyst.id})
    db.commit()
    db.refresh(recipient)
    return ClientRecipientResponse.model_validate(recipient)


@router.put("/{recipient_id}", response_model=ClientRecipientResponse)
def update_client_recipient(
    recipient_id: int,
    body: ClientRecipientUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_analyst),
) -> ClientRecipientResponse:
    """Update a client email recipient."""
    repo = ClientRecipientRepository(db)
    recipient = repo.get_by_id(recipient_id)
    if recipient is None:
        raise NotFoundException(detail=f"Client recipient {recipient_id} not found")

    update_data = body.model_dump(exclude_unset=True)
    if "email" in update_data and update_data["email"]:
        other = repo.get_by_email(str(update_data["email"]))
        if other is not None and other.id != recipient_id:
            raise BadRequestException(
                detail=f"Recipient with email {update_data['email']} already exists"
            )

    repo.update(recipient, update_data)
    db.commit()
    db.refresh(recipient)
    return ClientRecipientResponse.model_validate(recipient)


@router.delete("/{recipient_id}", status_code=204)
def delete_client_recipient(
    recipient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_analyst),
) -> None:
    """Remove a client email recipient."""
    repo = ClientRecipientRepository(db)
    recipient = repo.get_by_id(recipient_id)
    if recipient is None:
        raise NotFoundException(detail=f"Client recipient {recipient_id} not found")
    repo.delete(recipient)
    db.commit()
