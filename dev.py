#!/usr/bin/env python3

import contextlib
import json
import os
import subprocess


def main():
    with open(".env.api.dev.json", "r") as f:
        api_env = json.load(f)

    frontend_env = {
        "NODE_ENV": "development",
        "VITE_LOCAL_BACKEND": "1",
        "VITE_GOOGLE_CLIENT_ID": api_env["GOOGLE_CLIENT_ID"],
        "VITE_FIREBASE_CONFIG": api_env["FIREBASE_CONFIG"],
        "VITE_ENABLE_ADS": "1",
    }

    with contextlib.chdir("./packages/frontend"):
        proc = subprocess.Popen(
            ["npm", "run", "dev"], env={**os.environ, **frontend_env}
        )

    with contextlib.chdir("./packages/backend/api"):
        subprocess.run(["air"], env={**os.environ, **api_env})

    proc.kill()
    proc.wait()


if __name__ == "__main__":
    main()
