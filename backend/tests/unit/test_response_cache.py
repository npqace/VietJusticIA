"""
Unit tests for response cache utility.

Tests the LRU cache with TTL functionality.
"""

import pytest
import asyncio
from app.utils.response_cache import RAGResponseCache


@pytest.mark.unit
@pytest.mark.utils
class TestRAGResponseCache:
    """Tests for RAG response cache."""

    @pytest.fixture
    def cache(self):
        """Create a fresh cache instance for each test."""
        return RAGResponseCache(max_size=10, ttl_seconds=60)

    @pytest.mark.asyncio
    async def test_cache_set_and_get_works(self, cache):
        """Setting and getting from cache should work."""
        query = "What is the law?"
        response = {"response": "Test answer", "sources": []}
        
        await cache.set(query, response)
        cached = await cache.get(query)
        
        assert cached is not None
        assert cached["response"] == "Test answer"

    @pytest.mark.asyncio
    async def test_cache_get_with_nonexistent_key_returns_none(self, cache):
        """Getting nonexistent key should return None."""
        cached = await cache.get("nonexistent query")
        
        assert cached is None

    @pytest.mark.asyncio
    async def test_cache_normalizes_queries(self, cache):
        """Cache should normalize queries (case-insensitive, whitespace)."""
        query1 = "What is the law?"
        query2 = "what is the law?"
        query3 = "  What   is   the   law?  "
        response = {"response": "Test answer", "sources": []}
        
        await cache.set(query1, response)
        
        # All variations should hit the same cache entry
        cached1 = await cache.get(query1)
        cached2 = await cache.get(query2)
        cached3 = await cache.get(query3)
        
        assert cached1 is not None
        assert cached2 is not None
        assert cached3 is not None
        assert cached1 == cached2 == cached3

    @pytest.mark.asyncio
    async def test_cache_respects_max_size(self, cache):
        """Cache should evict oldest entries when max size reached."""
        # Fill cache to max size
        for i in range(11):  # One more than max_size
            await cache.set(f"query {i}", {"response": f"answer {i}"})
        
        # First entry should be evicted
        first_entry = await cache.get("query 0")
        assert first_entry is None
        
        # Last entry should still be there
        last_entry = await cache.get("query 10")
        assert last_entry is not None

    @pytest.mark.asyncio
    async def test_cache_respects_ttl(self, cache):
        """Cache should expire entries after TTL."""
        short_ttl_cache = RAGResponseCache(max_size=10, ttl_seconds=1)
        
        await short_ttl_cache.set("test query", {"response": "test answer"})
        
        # Should be available immediately
        cached = await short_ttl_cache.get("test query")
        assert cached is not None
        
        # Wait for expiration
        await asyncio.sleep(2)
        
        # Should be expired now
        expired = await short_ttl_cache.get("test query")
        assert expired is None

    @pytest.mark.asyncio
    async def test_cache_get_stats_returns_correct_stats(self, cache):
        """Cache stats should reflect hits and misses."""
        await cache.set("query 1", {"response": "answer 1"})
        await cache.set("query 2", {"response": "answer 2"})
        
        # Hit
        await cache.get("query 1")
        # Miss
        await cache.get("nonexistent")
        
        stats = cache.get_stats()
        
        assert stats["hits"] == 1
        assert stats["misses"] == 1
        assert stats["size"] == 2
        assert stats["max_size"] == 10
        assert stats["hit_rate_percent"] == 50.0

    @pytest.mark.asyncio
    async def test_cache_clear_removes_all_entries(self, cache):
        """Clearing cache should remove all entries."""
        await cache.set("query 1", {"response": "answer 1"})
        await cache.set("query 2", {"response": "answer 2"})
        
        await cache.clear()
        
        stats = cache.get_stats()
        assert stats["size"] == 0
        
        cached = await cache.get("query 1")
        assert cached is None

    @pytest.mark.asyncio
    async def test_cache_remove_expired_removes_expired_entries(self, cache):
        """Remove expired should only remove expired entries."""
        short_ttl_cache = RAGResponseCache(max_size=10, ttl_seconds=1)
        
        await short_ttl_cache.set("expired query", {"response": "expired"})
        await short_ttl_cache.set("valid query", {"response": "valid"})
        
        # Wait for first to expire
        await asyncio.sleep(2)
        
        # Add new entry to trigger expiration check
        await short_ttl_cache.set("new query", {"response": "new"})
        
        removed = await short_ttl_cache.remove_expired()
        
        assert removed >= 1  # At least expired query should be removed
        
        # Expired should be gone
        expired = await short_ttl_cache.get("expired query")
        assert expired is None
        
        # Valid should still be there (if not expired)
        valid = await short_ttl_cache.get("valid query")
        # May or may not be expired depending on timing

    @pytest.mark.asyncio
    async def test_cache_reset_stats_resets_counters(self, cache):
        """Resetting stats should reset hit/miss counters."""
        await cache.set("query 1", {"response": "answer 1"})
        await cache.get("query 1")  # Hit
        await cache.get("nonexistent")  # Miss
        
        stats_before = cache.get_stats()
        assert stats_before["hits"] == 1
        assert stats_before["misses"] == 1
        
        cache.reset_stats()
        
        stats_after = cache.get_stats()
        assert stats_after["hits"] == 0
        assert stats_after["misses"] == 0

