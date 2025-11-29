"""replace_cancelled_with_rejected_in_consultation_requests

Revision ID: 25274bff2b77
Revises: 454a54913a6d
Create Date: 2025-11-06 19:59:28.866730

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '25274bff2b77'
down_revision: Union[str, None] = '454a54913a6d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Update existing 'cancelled' records to 'rejected'
    op.execute("""
        UPDATE consultation_requests
        SET status = 'rejected'
        WHERE status = 'cancelled'
    """)

    # Since we're using native_enum=False, the values are stored as VARCHAR
    # No need to alter enum type, just update the data


def downgrade() -> None:
    # Revert 'rejected' back to 'cancelled'
    op.execute("""
        UPDATE consultation_requests
        SET status = 'cancelled'
        WHERE status = 'rejected'
    """)
