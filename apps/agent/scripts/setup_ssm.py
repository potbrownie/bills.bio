#!/usr/bin/env python3
"""Create or update AWS SSM parameters for the bills.bio agent.

Reads OPENAI_API_KEY and SERPER_API_KEY from the environment (or --env-file)
and stores them under SSM_PARAMETER_PREFIX (default /bills-bio/agent/).
Use when AWS credentials are configured (e.g. aws configure or env vars).

Usage:
  export OPENAI_API_KEY=sk-... SERPER_API_KEY=...
  python scripts/setup_ssm.py

  # Or from a .env file (script does not load .env; source it first or use --env-file)
  python scripts/setup_ssm.py --env-file .env

Requires: boto3, pip install boto3
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create or update SSM parameters for bills.bio agent (OPENAI_API_KEY, SERPER_API_KEY)."
    )
    parser.add_argument(
        "--prefix",
        default=os.environ.get("SSM_PARAMETER_PREFIX", "/bills-bio/agent/"),
        help="SSM parameter path prefix (default: /bills-bio/agent/).",
    )
    parser.add_argument(
        "--env-file",
        metavar="FILE",
        help="Read KEY=VALUE from file (e.g. .env); only OPENAI_API_KEY and SERPER_API_KEY are uploaded.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be uploaded without calling SSM.",
    )
    parser.add_argument(
        "--type",
        choices=["String", "SecureString"],
        default="SecureString",
        help="SSM parameter type (default: SecureString).",
    )
    args = parser.parse_args()

    prefix = args.prefix.rstrip("/") + "/"
    params: dict[str, str] = {}

    if args.env_file:
        path = Path(args.env_file)
        if not path.exists():
            print(f"Error: env file not found: {path}", file=sys.stderr)
            sys.exit(1)
        want = {"OPENAI_API_KEY", "SERPER_API_KEY"}
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key in want and value:
                    params[key] = value
    else:
        for key in ("OPENAI_API_KEY", "SERPER_API_KEY"):
            value = os.environ.get(key, "").strip()
            if value:
                params[key] = value

    if not params:
        print(
            "No OPENAI_API_KEY or SERPER_API_KEY found. Set them in the environment or use --env-file.",
            file=sys.stderr,
        )
        sys.exit(1)

    if args.dry_run:
        for key in params:
            print(f"Would create/update {prefix}{key} ({args.type})")
        return

    try:
        import boto3
    except ImportError:
        print("Error: boto3 is required. Run: pip install boto3", file=sys.stderr)
        sys.exit(1)

    region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
    client = boto3.client("ssm", region_name=region)
    for key, value in params.items():
        name = prefix + key
        try:
            client.put_parameter(
                Name=name,
                Value=value,
                Type=args.type,
                Overwrite=True,
            )
            print(f"Created/updated: {name}")
        except Exception as e:
            print(f"Error updating {name}: {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
