"""
Robots.txt handling for respecting website crawl policies.
"""
import logging
import requests
from urllib.robotparser import RobotFileParser

from .config import SITE_BASE_URL, CRAWLER_SETTINGS, DEFAULT_USER_AGENT


class RobotsHandler:
    """Handles robots.txt parsing and crawl policy enforcement."""
    
    def __init__(self, logger: logging.Logger):
        """
        Initialize the robots handler and parse robots.txt.
        
        Args:
            logger: Logger instance for logging operations.
        """
        self.logger = logger
        self.user_agent = DEFAULT_USER_AGENT
        self.robot_parser = RobotFileParser()
        self._load_robots_txt()
    
    def _load_robots_txt(self) -> None:
        """Fetches and parses the robots.txt file from the target site."""
        robots_url = f"{SITE_BASE_URL}/robots.txt"
        self.robot_parser.set_url(robots_url)
        
        try:
            response = requests.get(
                robots_url, 
                headers={'User-Agent': self.user_agent}, 
                timeout=15
            )
            if response.status_code == 200:
                self.robot_parser.parse(response.text.splitlines())
                self.logger.info("Successfully read and parsed robots.txt")
            else:
                self.logger.warning(
                    f"Failed to fetch robots.txt, received status {response.status_code}. "
                    "Crawler will proceed assuming no restrictions."
                )
        except requests.exceptions.RequestException as e:
            self.logger.error(
                f"Could not read robots.txt: {e}. "
                "Crawler will proceed assuming no restrictions."
            )
    
    def is_allowed(self, url: str) -> bool:
        """
        Checks if the given URL is allowed to be fetched by the crawler.
        
        Args:
            url: The URL to check.
        
        Returns:
            True if crawling is allowed, False otherwise.
        """
        return self.robot_parser.can_fetch(self.user_agent, url)
    
    def get_crawl_delay(self) -> int:
        """
        Gets the crawl delay from robots.txt, defaulting to configured setting.
        
        Returns:
            The crawl delay in seconds.
        """
        crawl_delay = self.robot_parser.crawl_delay(self.user_agent)
        
        if crawl_delay and isinstance(crawl_delay, (int, float)):
            self.logger.info(f"robots.txt specifies Crawl-Delay of {crawl_delay} seconds.")
            return max(crawl_delay, CRAWLER_SETTINGS['delay_between_requests'])
        
        return CRAWLER_SETTINGS['delay_between_requests']
