"""
WebSocket Connection Manager for real-time conversations.

Manages WebSocket connections for lawyer-user conversations,
handles message broadcasting, and typing indicators.
"""
from fastapi import WebSocket
from typing import Dict, List, Set
import logging
import json
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for conversations.

    Structure:
    - active_connections: Dict[conversation_id, List[WebSocket]]
    - Each conversation can have multiple connections (user + lawyer)
    """

    def __init__(self):
        # conversation_id -> list of WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

        # Track which user is connected to which conversation
        # Format: {conversation_id: {user_id: websocket}}
        self.user_connections: Dict[str, Dict[int, WebSocket]] = {}

        # Track typing status per conversation
        # Format: {conversation_id: {user_id: is_typing}}
        self.typing_status: Dict[str, Dict[int, bool]] = {}

    async def connect(
        self,
        conversation_id: str,
        websocket: WebSocket,
        user_id: int,
        user_type: str
    ):
        """
        Accept and register a new WebSocket connection.

        Args:
            conversation_id: ID of the conversation
            websocket: WebSocket connection instance
            user_id: ID of the connected user
            user_type: Type of user ('user' or 'lawyer')
        """
        await websocket.accept()

        # Add to active connections list
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
            self.user_connections[conversation_id] = {}
            self.typing_status[conversation_id] = {}

        self.active_connections[conversation_id].append(websocket)
        self.user_connections[conversation_id][user_id] = websocket

        logger.info(
            f"WebSocket connected: conversation={conversation_id}, "
            f"user_id={user_id}, type={user_type}"
        )

        # Small delay to let React Native WebSocket stabilize
        await asyncio.sleep(0.1)

        # Notify about successful connection
        await self.send_personal_message(
            websocket,
            {
                "type": "connection_established",
                "conversation_id": conversation_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    async def disconnect(
        self,
        conversation_id: str,
        websocket: WebSocket,
        user_id: int
    ):
        """
        Remove a WebSocket connection.

        Args:
            conversation_id: ID of the conversation
            websocket: WebSocket connection to remove
            user_id: ID of the disconnected user
        """
        if conversation_id in self.active_connections:
            if websocket in self.active_connections[conversation_id]:
                self.active_connections[conversation_id].remove(websocket)

            # Remove from user connections
            if user_id in self.user_connections.get(conversation_id, {}):
                del self.user_connections[conversation_id][user_id]

            # Clean up empty conversation entries
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]
                if conversation_id in self.user_connections:
                    del self.user_connections[conversation_id]
                if conversation_id in self.typing_status:
                    del self.typing_status[conversation_id]

        logger.info(
            f"WebSocket disconnected: conversation={conversation_id}, user_id={user_id}"
        )

    async def send_personal_message(self, websocket: WebSocket, message: dict):
        """
        Send message to a specific WebSocket connection.

        Args:
            websocket: Target WebSocket connection
            message: Message dictionary to send
        """
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")

    async def broadcast_to_conversation(
        self,
        conversation_id: str,
        message: dict,
        exclude_user_id: int = None
    ):
        """
        Broadcast message to all connections in a conversation.

        Args:
            conversation_id: ID of the conversation
            message: Message dictionary to broadcast
            exclude_user_id: Optional user ID to exclude from broadcast
        """
        if conversation_id not in self.active_connections:
            logger.warning(
                f"No active connections for conversation {conversation_id}"
            )
            return

        # Get list of connections to broadcast to
        connections = self.active_connections[conversation_id].copy()

        # Exclude specific user if requested
        if exclude_user_id and conversation_id in self.user_connections:
            exclude_ws = self.user_connections[conversation_id].get(exclude_user_id)
            if exclude_ws in connections:
                connections.remove(exclude_ws)

        # Broadcast to all remaining connections
        disconnected = []
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to broadcast message: {e}")
                disconnected.append(connection)

        # Clean up disconnected connections
        for connection in disconnected:
            if connection in self.active_connections[conversation_id]:
                self.active_connections[conversation_id].remove(connection)

    async def broadcast_typing_indicator(
        self,
        conversation_id: str,
        user_id: int,
        user_type: str,
        is_typing: bool
    ):
        """
        Broadcast typing indicator to other party in conversation.

        Args:
            conversation_id: ID of the conversation
            user_id: ID of the typing user
            user_type: Type of user ('user' or 'lawyer')
            is_typing: Whether user is currently typing
        """
        # Update typing status
        if conversation_id not in self.typing_status:
            self.typing_status[conversation_id] = {}

        # Only broadcast if status actually changed
        current_status = self.typing_status[conversation_id].get(user_id)
        if current_status == is_typing:
            # Status hasn't changed, don't broadcast
            return

        self.typing_status[conversation_id][user_id] = is_typing

        # Broadcast to others (exclude sender)
        await self.broadcast_to_conversation(
            conversation_id=conversation_id,
            message={
                "type": "typing_indicator",
                "user_id": user_id,
                "user_type": user_type,
                "is_typing": is_typing,
                "timestamp": datetime.utcnow().isoformat()
            },
            exclude_user_id=user_id
        )

    async def broadcast_read_receipt(
        self,
        conversation_id: str,
        reader_user_id: int,
        reader_type: str,
        message_ids: List[str]
    ):
        """
        Broadcast read receipt to other party in conversation.

        Args:
            conversation_id: ID of the conversation
            reader_user_id: ID of user who read the messages
            reader_type: Type of user ('user' or 'lawyer')
            message_ids: List of message IDs that were read
        """
        await self.broadcast_to_conversation(
            conversation_id=conversation_id,
            message={
                "type": "read_receipt",
                "reader_user_id": reader_user_id,
                "reader_type": reader_type,
                "message_ids": message_ids,
                "timestamp": datetime.utcnow().isoformat()
            },
            exclude_user_id=reader_user_id
        )

    def get_connection_count(self, conversation_id: str) -> int:
        """
        Get number of active connections for a conversation.

        Args:
            conversation_id: ID of the conversation

        Returns:
            Number of active connections
        """
        return len(self.active_connections.get(conversation_id, []))

    def get_stats(self) -> dict:
        """
        Get statistics about active connections.

        Returns:
            Dictionary with connection statistics
        """
        return {
            "total_conversations": len(self.active_connections),
            "total_connections": sum(
                len(conns) for conns in self.active_connections.values()
            ),
            "conversations": {
                conv_id: len(conns)
                for conv_id, conns in self.active_connections.items()
            }
        }


# Global connection manager instance
manager = ConnectionManager()
