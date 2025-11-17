"""
Unit tests for rate limiter utility.

Tests the token bucket algorithm for API rate limiting.
"""

import pytest
import asyncio
from app.utils.rate_limiter import GeminiRateLimiter


@pytest.mark.unit
@pytest.mark.utils
class TestGeminiRateLimiter:
    """Tests for Gemini rate limiter."""

    @pytest.fixture
    def limiter(self):
        """Create a fresh rate limiter for each test."""
        return GeminiRateLimiter(
            requests_per_minute=10,
            requests_per_day=100,
            burst_allowance=0.8
        )

    def test_rate_limiter_initialization(self, limiter):
        """Rate limiter should initialize with correct limits."""
        # After burst allowance (0.8), limits are: 8 RPM, 80 RPD
        assert limiter.rpm_limit == 8  # 80% of 10
        assert limiter.rpd_limit == 80  # 80% of 100

    @pytest.mark.asyncio
    async def test_rate_limiter_allows_request_when_under_limit(self, limiter):
        """Rate limiter should allow requests when under limit."""
        allowed = await limiter.acquire()
        
        assert allowed is True

    @pytest.mark.asyncio
    async def test_rate_limiter_blocks_request_when_over_rpm_limit(self, limiter):
        """Rate limiter should block requests when over RPM limit."""
        # Consume all RPM tokens (8 = 80% of 10)
        for _ in range(8):
            await limiter.acquire()
        
        # Next request should be blocked
        allowed = await limiter.acquire()
        assert allowed is False

    @pytest.mark.asyncio
    async def test_rate_limiter_blocks_request_when_over_rpd_limit(self, limiter):
        """Rate limiter should block requests when over RPD limit."""
        # Consume all RPD tokens (80 = 80% of 100)
        for _ in range(80):
            await limiter.acquire()
        
        # Next request should be blocked
        allowed = await limiter.acquire()
        assert allowed is False

    @pytest.mark.asyncio
    async def test_rate_limiter_get_stats_returns_correct_stats(self, limiter):
        """Rate limiter stats should reflect current state."""
        # Make some requests
        for _ in range(5):
            await limiter.acquire()
        
        stats = limiter.get_stats()
        
        assert stats["requests_today"] == 5
        assert stats["rpm_limit"] == 8  # 80% of 10
        assert stats["rpd_limit"] == 80  # 80% of 100
        assert "requests_last_minute" in stats
        assert "rpm_remaining" in stats
        assert "rpd_remaining" in stats

    @pytest.mark.asyncio
    async def test_rate_limiter_tracks_daily_requests(self, limiter):
        """Rate limiter should track daily request count."""
        # Make some requests
        for _ in range(5):
            await limiter.acquire()
        
        stats = limiter.get_stats()
        assert stats["requests_today"] == 5
        assert stats["rpd_remaining"] == 75  # 80 - 5 = 75

    @pytest.mark.asyncio
    async def test_rate_limiter_respects_burst_allowance(self, limiter):
        """Rate limiter should respect burst allowance (80% of limit)."""
        # With burst_allowance=0.8, should allow 8 requests (80% of 10)
        allowed_count = 0
        for _ in range(10):
            if await limiter.acquire():
                allowed_count += 1
        
        # Should allow exactly 8 requests (80% of 10)
        assert allowed_count == 8

