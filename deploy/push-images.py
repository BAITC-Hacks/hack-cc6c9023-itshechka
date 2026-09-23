"""Stream prebuilt Docker images to a server without staging a large archive."""

import argparse
import gzip
import shutil
import subprocess
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--identity", required=True, help="Path to an SSH private key")
    parser.add_argument("--target", required=True, help="SSH target, for example root@server")
    parser.add_argument("--image", action="append", help="Image to transfer (repeatable); defaults to API and web")
    args = parser.parse_args()

    images = args.image or ["hackalem-api:deploy", "hackalem-web:deploy"]
    sender = subprocess.Popen(
        ["docker", "save", *images],
        stdout=subprocess.PIPE,
    )
    receiver = subprocess.Popen(
        [
            "ssh", "-i", args.identity, "-o", "BatchMode=yes",
            "-o", "ServerAliveInterval=15", args.target,
            "bash -o pipefail -c 'gzip -dc | docker load'",
        ],
        stdin=subprocess.PIPE,
    )
    assert sender.stdout is not None
    assert receiver.stdin is not None
    try:
        with gzip.GzipFile(fileobj=receiver.stdin, mode="wb", compresslevel=1) as compressed:
            shutil.copyfileobj(sender.stdout, compressed, length=1024 * 1024)
        receiver.stdin.close()
        sender.stdout.close()
        sender_code = sender.wait()
        receiver_code = receiver.wait()
        if sender_code or receiver_code:
            print(f"Transfer failed: docker save={sender_code}, ssh/docker load={receiver_code}", file=sys.stderr)
            return 1
        return 0
    except Exception:
        sender.kill()
        receiver.kill()
        sender.wait()
        receiver.wait()
        raise


if __name__ == "__main__":
    raise SystemExit(main())
