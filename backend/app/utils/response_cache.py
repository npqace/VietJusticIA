"""
Response caching for RAG queries to reduce Gemini API calls.

Implements in-memory LRU cache with TTL for RAG responses.
"""

import hashlib
import time
from collections import OrderedDict
from typing import Optional, Dict, Any
import asyncio


class RAGResponseCache:
    """
    LRU cache with TTL for RAG responses.

    Caches query responses to avoid repeated API calls for similar questions.
    """

    def __init__(
        self,
        max_size: int = 500,
        ttl_seconds: int = 3600,  # 1 hour default
        enable_fuzzy_matching: bool = True
    ):
        """
        Initialize response cache.

        Args:
            max_size: Maximum number of cached responses (default: 500)
            ttl_seconds: Time-to-live for cached entries in seconds (default: 3600 = 1 hour)
            enable_fuzzy_matching: Enable fuzzy matching for similar queries (default: True)
        """
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self.enable_fuzzy_matching = enable_fuzzy_matching

        # OrderedDict for LRU behavior
        self.cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()

        # Lock for thread safety
        self.lock = asyncio.Lock()

        # Statistics
        self.hits = 0
        self.misses = 0

        print(f"RAGResponseCache initialized: max_size={max_size}, ttl={ttl_seconds}s")

    def _normalize_query(self, query: str) -> str:
        """
        Normalize query for consistent cache keys.

        Args:
            query: Raw query string

        Returns:
            str: Normalized query
        """
        # Convert to lowercase, strip whitespace, remove extra spaces
        normalized = " ".join(query.lower().strip().split())
        return normalized

    def _generate_cache_key(self, query: str) -> str:
        """
        Generate cache key from query.

        Args:
            query: Normalized query string

        Returns:
            str: SHA256 hash of query
        """
        return hashlib.sha256(query.encode('utf-8')).hexdigest()

    async def get(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Get cached response for query.

        Args:
            query: User query string

        Returns:
            Optional[Dict]: Cached response or None if not found/expired
        """
        async with self.lock:
            normalized_query = self._normalize_query(query)
            cache_key = self._generate_cache_key(normalized_query)

            # Check if key exists
            if cache_key not in self.cache:
                self.misses += 1
                return None

            # Get cached entry
            entry = self.cache[cache_key]

            # Check TTL
            if time.time() - entry["timestamp"] > self.ttl_seconds:
                # Expired - remove from cache
                del self.cache[cache_key]
                self.misses += 1
                return None

            # Move to end (most recently used)
            self.cache.move_to_end(cache_key)

            # Cache hit
            self.hits += 1
            return entry["response"]

    async def set(self, query: str, response: Dict[str, Any]) -> None:
        """
        Cache a response.

        Args:
            query: User query string
            response: Response data to cache
        """
        async with self.lock:
            normalized_query = self._normalize_query(query)
            cache_key = self._generate_cache_key(normalized_query)

            # Check if cache is full
            if len(self.cache) >= self.max_size and cache_key not in self.cache:
                # Remove oldest entry (FIFO from OrderedDict)
                self.cache.popitem(last=False)

            # Add/update entry
            self.cache[cache_key] = {
                "query": normalized_query,
                "response": response,
                "timestamp": time.time(),
            }

            # Move to end (most recently used)
            self.cache.move_to_end(cache_key)

    async def clear(self) -> None:
        """Clear all cached entries."""
        async with self.lock:
            self.cache.clear()
            print("Cache cleared")

    async def remove_expired(self) -> int:
        """
        Remove expired entries from cache.

        Returns:
            int: Number of entries removed
        """
        async with self.lock:
            now = time.time()
            expired_keys = [
                key for key, entry in self.cache.items()
                if now - entry["timestamp"] > self.ttl_seconds
            ]

            for key in expired_keys:
                del self.cache[key]

            if expired_keys:
                print(f"Removed {len(expired_keys)} expired cache entries")

            return len(expired_keys)

    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            dict: Cache stats
        """
        total_requests = self.hits + self.misses
        hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0

        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate_percent": round(hit_rate, 2),
            "ttl_seconds": self.ttl_seconds,
        }

    def reset_stats(self) -> None:
        """Reset hit/miss statistics."""
        self.hits = 0
        self.misses = 0


# Global cache instance with environment-based configuration
import os

_cache_max_size = int(os.getenv("CACHE_MAX_SIZE", "500"))
_cache_ttl = int(os.getenv("CACHE_TTL_SECONDS", "3600"))

rag_response_cache = RAGResponseCache(
    max_size=_cache_max_size,  # Configurable cache size
    ttl_seconds=_cache_ttl,  # Configurable TTL
)


# Background task to clean expired entries periodically
async def cleanup_expired_cache_entries():
    """Background task to periodically clean up expired cache entries."""
    while True:
        await asyncio.sleep(300)  # Run every 5 minutes
        try:
            removed = await rag_response_cache.remove_expired()
            if removed > 0:
                stats = rag_response_cache.get_stats()
                print(f"Cache cleanup: {removed} expired entries removed. Stats: {stats}")
        except Exception as e:
            print(f"Error during cache cleanup: {e}")
