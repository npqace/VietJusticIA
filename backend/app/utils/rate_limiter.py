"""
Rate limiter for Gemini API free tier.

Free tier limits:
- 15 requests per minute (RPM)
- 1,500 requests per day (RPD)
- 1 million tokens per minute (TPM)
"""

import os
import time
import asyncio
import logging
from collections import deque
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class GeminiRateLimiter:
    """
    Token bucket rate limiter for Gemini API free tier.

    Implements sliding window rate limiting to prevent hitting API quotas.
    """

    def __init__(
        self,
        requests_per_minute: int = 15,
        requests_per_day: int = 1500,
        burst_allowance: float = 0.8  # Use 80% of limit for safety margin
    ):
        """
        Initialize rate limiter with Gemini free tier limits.

        Args:
            requests_per_minute: Max requests per minute (default: 15 for free tier)
            requests_per_day: Max requests per day (default: 1500 for free tier)
            burst_allowance: Safety margin (0.8 = use only 80% of limit)
        """
        # Apply safety margin
        self.rpm_limit = int(requests_per_minute * burst_allowance)
        self.rpd_limit = int(requests_per_day * burst_allowance)

        # Sliding window for minute-level tracking
        self.minute_requests = deque()

        # Daily counter
        self.daily_requests = 0
        self.daily_reset_time = datetime.now() + timedelta(days=1)

        # Lock for thread safety
        self.lock = asyncio.Lock()

        logger.info(f"GeminiRateLimiter initialized: {self.rpm_limit} RPM, {self.rpd_limit} RPD")

    async def acquire(self) -> bool:
        """
        Acquire permission to make an API request.

        Returns:
            bool: True if request is allowed, False if rate limit would be exceeded
        """
        async with self.lock:
            now = time.time()

            # Reset daily counter if needed
            if datetime.now() >= self.daily_reset_time:
                self.daily_requests = 0
                self.daily_reset_time = datetime.now() + timedelta(days=1)
                self.daily_requests = 0
                self.daily_reset_time = datetime.now() + timedelta(days=1)
                logger.info("Daily rate limit counter reset")

            # Check daily limit
            if self.daily_requests >= self.rpd_limit:
                return False

            # Remove requests older than 1 minute
            one_minute_ago = now - 60
            while self.minute_requests and self.minute_requests[0] < one_minute_ago:
                self.minute_requests.popleft()

            # Check minute limit
            if len(self.minute_requests) >= self.rpm_limit:
                return False

            # Grant permission
            self.minute_requests.append(now)
            self.daily_requests += 1

            return True

    async def wait_if_needed(self, max_wait_seconds: float = 5.0) -> bool:
        """
        Wait until a request slot is available or timeout.

        Args:
            max_wait_seconds: Maximum time to wait (default: 5 seconds)

        Returns:
            bool: True if slot acquired, False if timeout
        """
        start_time = time.time()

        while True:
            if await self.acquire():
                return True

            # Check timeout
            elapsed = time.time() - start_time
            if elapsed >= max_wait_seconds:
                return False

            # Wait before retry (100ms intervals)
            await asyncio.sleep(0.1)

    def get_stats(self) -> Dict[str, Any]:
        """
        Get current rate limiter statistics.

        Returns:
            dict: Current usage stats
        """
        now = time.time()
        one_minute_ago = now - 60

        # Count requests in last minute
        minute_count = sum(1 for t in self.minute_requests if t >= one_minute_ago)

        return {
            "requests_last_minute": minute_count,
            "rpm_limit": self.rpm_limit,
            "rpm_remaining": max(0, self.rpm_limit - minute_count),
            "requests_today": self.daily_requests,
            "rpd_limit": self.rpd_limit,
            "rpd_remaining": max(0, self.rpd_limit - self.daily_requests),
            "daily_reset_in": str(self.daily_reset_time - datetime.now()),
        }

    def is_near_limit(self, threshold: float = 0.9) -> bool:
        """
        Check if we're approaching rate limits.

        Args:
            threshold: Warning threshold (0.9 = warn at 90% usage)

        Returns:
            bool: True if near any limit
        """
        stats = self.get_stats()

        minute_usage = stats["requests_last_minute"] / self.rpm_limit
        daily_usage = self.daily_requests / self.rpd_limit

        return minute_usage >= threshold or daily_usage >= threshold


# Global rate limiter instance with environment-based configuration

_rpm_limit = int(os.getenv("GEMINI_RPM_LIMIT", "15"))
_rpd_limit = int(os.getenv("GEMINI_RPD_LIMIT", "1500"))
_burst_allowance = float(os.getenv("RATE_LIMIT_BURST_ALLOWANCE", "0.8"))

gemini_rate_limiter = GeminiRateLimiter(
    requests_per_minute=_rpm_limit,
    requests_per_day=_rpd_limit,
    burst_allowance=_burst_allowance
)
