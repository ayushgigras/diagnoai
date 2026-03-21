"""Add Google auth and password reset fields

Revision ID: 7b2f9d4a33b1
Revises: 89d13d0add81
Create Date: 2026-03-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7b2f9d4a33b1"
down_revision: Union[str, Sequence[str], None] = "89d13d0add81"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("google_sub", sa.String(), nullable=True))
    op.add_column("users", sa.Column("auth_provider", sa.String(), nullable=False, server_default="local"))
    op.add_column("users", sa.Column("password_reset_token_hash", sa.String(), nullable=True))
    op.add_column("users", sa.Column("password_reset_token_expires_at", sa.DateTime(), nullable=True))
    op.create_unique_constraint("uq_users_google_sub", "users", ["google_sub"])

    op.alter_column("users", "auth_provider", server_default=None)


def downgrade() -> None:
    op.drop_constraint("uq_users_google_sub", "users", type_="unique")
    op.drop_column("users", "password_reset_token_expires_at")
    op.drop_column("users", "password_reset_token_hash")
    op.drop_column("users", "auth_provider")
    op.drop_column("users", "google_sub")
