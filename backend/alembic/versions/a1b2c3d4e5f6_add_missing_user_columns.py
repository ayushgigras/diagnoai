"""add missing user columns

Revision ID: a1b2c3d4e5f6
Revises: 485141c5427a
Create Date: 2026-04-26 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '485141c5427a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('phone', sa.String(), nullable=True))
    op.add_column('users', sa.Column('location', sa.String(), nullable=True))
    op.add_column('users', sa.Column('profile_image_url', sa.String(), nullable=True))
    op.add_column('users', sa.Column('specialization', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'specialization')
    op.drop_column('users', 'profile_image_url')
    op.drop_column('users', 'location')
    op.drop_column('users', 'phone')
