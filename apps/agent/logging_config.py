"""Logging configuration for the agent."""

import logging
import sys


def setup_logging():
    """Configure logging for the agent with performance metrics."""
    # Root logger
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s:%(name)s: %(message)s",
        stream=sys.stdout,
    )
    
    # Agent logger
    logging.getLogger("agent").setLevel(logging.INFO)
    
    # Performance logger
    logging.getLogger("agent.performance").setLevel(logging.INFO)
    
    # Suppress noisy loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
