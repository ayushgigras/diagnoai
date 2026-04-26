"""add email verification

Revision ID: 485141c5427a
Revises: 7b2f9d4a33b1
Create Date: 2026-03-21 21:44:19.464778
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '485141c5427a'
down_revision: Union[str, Sequence[str], None] = '7b2f9d4a33b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), server_default='false', nullable=True))
    op.add_column('users', sa.Column('verification_token_hash', sa.String(), nullable=True))
    op.add_column('users', sa.Column('verification_token_expires_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'verification_token_expires_at')
    op.drop_column('users', 'verification_token_hash')
    op.drop_column('users', 'is_verified')
