"""add help requests table

Revision ID: 454a54913a6d
Revises: 2a9e3238f4f1
Create Date: 2025-11-04 13:26:49.586936

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '454a54913a6d'
down_revision: Union[str, None] = '2a9e3238f4f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create help_requests table
    op.create_table(
        'help_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('full_name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=100), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'in_progress', 'resolved', 'closed', name='helpstatus', native_enum=False), nullable=False, server_default='pending'),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('admin_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['admin_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index(op.f('ix_help_requests_id'), 'help_requests', ['id'], unique=False)
    op.create_index(op.f('ix_help_requests_user_id'), 'help_requests', ['user_id'], unique=False)
    op.create_index(op.f('ix_help_requests_email'), 'help_requests', ['email'], unique=False)
    op.create_index(op.f('ix_help_requests_status'), 'help_requests', ['status'], unique=False)
    op.create_index(op.f('ix_help_requests_created_at'), 'help_requests', ['created_at'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_help_requests_created_at'), table_name='help_requests')
    op.drop_index(op.f('ix_help_requests_status'), table_name='help_requests')
    op.drop_index(op.f('ix_help_requests_email'), table_name='help_requests')
    op.drop_index(op.f('ix_help_requests_user_id'), table_name='help_requests')
    op.drop_index(op.f('ix_help_requests_id'), table_name='help_requests')

    # Drop table
    op.drop_table('help_requests')
