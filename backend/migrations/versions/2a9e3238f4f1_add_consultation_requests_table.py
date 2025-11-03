"""add_consultation_requests_table

Revision ID: 2a9e3238f4f1
Revises: e84a665cbefd
Create Date: 2025-11-02 17:48:01.430186

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2a9e3238f4f1'
down_revision: Union[str, None] = 'e84a665cbefd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'consultation_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('full_name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=100), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=False),
        sa.Column('province', sa.String(length=100), nullable=False),
        sa.Column('district', sa.String(length=100), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'in_progress', 'completed', 'cancelled', name='consultationstatus', native_enum=False), nullable=False, server_default='pending'),
        sa.Column('priority', sa.Enum('low', 'medium', 'high', name='priority', native_enum=False), nullable=False, server_default='medium'),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('assigned_lawyer_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['assigned_lawyer_id'], ['lawyers.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_consultation_requests_created_at'), 'consultation_requests', ['created_at'], unique=False)
    op.create_index(op.f('ix_consultation_requests_email'), 'consultation_requests', ['email'], unique=False)
    op.create_index(op.f('ix_consultation_requests_id'), 'consultation_requests', ['id'], unique=False)
    op.create_index(op.f('ix_consultation_requests_status'), 'consultation_requests', ['status'], unique=False)
    op.create_index(op.f('ix_consultation_requests_user_id'), 'consultation_requests', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_consultation_requests_user_id'), table_name='consultation_requests')
    op.drop_index(op.f('ix_consultation_requests_status'), table_name='consultation_requests')
    op.drop_index(op.f('ix_consultation_requests_id'), table_name='consultation_requests')
    op.drop_index(op.f('ix_consultation_requests_email'), table_name='consultation_requests')
    op.drop_index(op.f('ix_consultation_requests_created_at'), table_name='consultation_requests')
    op.drop_table('consultation_requests')
