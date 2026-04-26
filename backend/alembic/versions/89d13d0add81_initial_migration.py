"""Initial migration

Revision ID: 89d13d0add81
Revises: 
Create Date: 2026-03-06 21:55:15.133600
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '89d13d0add81'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('patients',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('first_name', sa.String(), nullable=False),
    sa.Column('last_name', sa.String(), nullable=False),
    sa.Column('date_of_birth', sa.String(), nullable=True),
    sa.Column('gender', sa.String(), nullable=True),
    sa.Column('contact_number', sa.String(), nullable=True),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_patients_id'), 'patients', ['id'], unique=False)
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('hashed_password', sa.String(), nullable=False),
    sa.Column('full_name', sa.String(), nullable=True),
    sa.Column('role', sa.String(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('bio', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_table('reports',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=True),
    sa.Column('doctor_id', sa.Integer(), nullable=True),
    sa.Column('report_type', sa.String(), nullable=False),
    sa.Column('file_path', sa.String(), nullable=True),
    sa.Column('status', sa.String(), nullable=True),
    sa.Column('result_data', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('task_id', sa.String(), nullable=True),
    sa.ForeignKeyConstraint(['doctor_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reports_id'), 'reports', ['id'], unique=False)
    op.create_index(op.f('ix_reports_task_id'), 'reports', ['task_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_reports_task_id'), table_name='reports')
    op.drop_index(op.f('ix_reports_id'), table_name='reports')
    op.drop_table('reports')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_patients_id'), table_name='patients')
    op.drop_table('patients')
