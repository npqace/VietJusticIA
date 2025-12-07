"""
Logging configuration for the web crawler.
Provides a colored console output and file logging setup.
"""
import logging
from pathlib import Path


class ColoredFormatter(logging.Formatter):
    """Custom formatter that adds colors to console log output."""
    
    # ANSI color codes
    GREY = "\x1b[38;20m"
    YELLOW = "\x1b[33;20m"
    RED = "\x1b[31;20m"
    BOLD_RED = "\x1b[31;1m"
    BLUE = "\x1b[34;20m"
    RESET = "\x1b[0m"
    
    def __init__(self, fmt: str):
        super().__init__()
        self.fmt = fmt
        self.FORMATS = {
            logging.DEBUG: self.GREY + self.fmt + self.RESET,
            logging.INFO: self.BLUE + self.fmt + self.RESET,
            logging.WARNING: self.YELLOW + self.fmt + self.RESET,
            logging.ERROR: self.RED + self.fmt + self.RESET,
            logging.CRITICAL: self.BOLD_RED + self.fmt + self.RESET,
        }

    def format(self, record: logging.LogRecord) -> str:
        log_fmt = self.FORMATS.get(record.levelno)
        formatter = logging.Formatter(log_fmt)
        return formatter.format(record)


def setup_logger(logs_dir: Path, logger_name: str = 'crawler_logger') -> logging.Logger:
    """
    Sets up a logger that outputs formatted messages to both console and a file.
    
    Args:
        logs_dir: Directory path where log files will be stored.
        logger_name: Name of the logger instance.
    
    Returns:
        Configured logger instance.
    """
    logs_dir.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.INFO)

    # Avoid adding duplicate handlers
    if logger.hasHandlers():
        return logger

    # Console handler with colored output
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(ColoredFormatter(" %(levelname)s - %(message)s"))
    logger.addHandler(console_handler)

    # File handler for persistent logs
    file_handler = logging.FileHandler(logs_dir / "crawler.log", encoding="utf-8")
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(file_handler)

    return logger
