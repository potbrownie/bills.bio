"""Configuration: environment vars, SSM loader, OpenAI settings."""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


def load_env_from_ssm() -> None:
    """Load environment variables from AWS SSM Parameter Store when USE_SSM=true.

    Requires boto3 (pip install boto3) and AWS credentials configured.
    Loads parameters from SSM_PARAMETER_PREFIX path (default: /bills-bio/agent/).
    """
    if os.environ.get("USE_SSM", "false").strip().lower() not in ("true", "1", "yes"):
        return
    try:
        import boto3

        prefix = os.environ.get("SSM_PARAMETER_PREFIX", "/bills-bio/agent/")
        ssm = boto3.client("ssm")
        response = ssm.get_parameters_by_path(Path=prefix, WithDecryption=True)
        for param in response.get("Parameters", []):
            name = param["Name"].replace(prefix, "").replace("/", "_").upper()
            value = param["Value"]
            os.environ[name] = value
            logger.info("Loaded %s from SSM", name)
    except ImportError:
        logger.warning("boto3 not installed; cannot load from SSM (pip install boto3)")
    except Exception as e:
        logger.warning("Failed to load from SSM: %s", e)


def get_openai_timeout_seconds() -> float:
    """Return OPENAI_TIMEOUT_SECONDS from env (default: 60)."""
    return float(os.environ.get("OPENAI_TIMEOUT_SECONDS", "60"))


def get_openai_max_tokens() -> int | None:
    """Return OPENAI_MAX_TOKENS from env (default: None = model default)."""
    val = os.environ.get("OPENAI_MAX_TOKENS", "0").strip()
    if not val or val == "0":
        return None
    return int(val)


def get_model() -> str:
    """Return OPENAI_MODEL from env (default: gpt-4o-mini)."""
    return os.environ.get("OPENAI_MODEL", "gpt-4o-mini")


def enable_fast_mode() -> bool:
    """Return true if FAST_MODE=true (uses gpt-4o-mini with lower max_tokens)."""
    return os.environ.get("FAST_MODE", "false").strip().lower() in ("true", "1", "yes")
