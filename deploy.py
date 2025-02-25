#!/usr/bin/env python3

import copy
import json
import os
import subprocess
import sys


def convert_firebase_config(config: str):
    old: dict[str, str] = json.loads(config)
    new = {}
    for k, v in old.items():
        # convert to camelcase
        new_k = "".join(map(lambda word: word.title(), k.split("_")))
        new_k = new_k[0].lower() + new_k[1:]
        new[new_k] = v
    new["projectId"] = old["project"]
    return json.dumps(new)


def main():
    stage = "prod" if len(sys.argv) > 1 and sys.argv[1] == "prod" else "dev"
    tf_env_file = f".env.tf.{stage}.json"
    # expects:
    # "TF_VAR_billing_account"
    # "TF_VAR_google_client_id"
    # "TF_VAR_google_client_secret"
    # "TF_VAR_stripe_api_key"
    with open(tf_env_file, "r") as f:
        tf_env = json.load(f)

    os.chdir(f"./infra/{stage}")
    p = subprocess.run(
        ["terraform", "apply", "-auto-approve"],
        env={
            **os.environ,
            **tf_env,
        },
    )
    p.check_returncode()

    p = subprocess.run(["terraform", "output", "-json"], capture_output=True)
    p.check_returncode()
    tf_outputs = {k: v["value"] for k, v in json.loads(p.stdout).items()}
    api_env = copy.deepcopy(tf_outputs)
    api_env["GIN_MODE"] = "debug"
    api_env["GOOGLE_REDIRECT_URL"] = "http://localhost:3000"
    for k, v in tf_env.items():
        k = k[len("TF_VAR_") :].upper()
        api_env[k] = v
    api_env["FIREBASE_CONFIG"] = convert_firebase_config(api_env["FIREBASE_CONFIG"])
    # save outputs to env file for local development
    if stage == "dev":
        with open(f"../../.env.api.{stage}.json", "w") as f:
            json.dump(api_env, f, sort_keys=True, indent=4)

    os.chdir("../../packages/frontend")

    frontend_env = {
        "NODE_ENV": "production",
        "VITE_LOCAL_BACKEND": "0",
        "VITE_GOOGLE_CLIENT_ID": api_env["GOOGLE_CLIENT_ID"],
        "VITE_FIREBASE_CONFIG": api_env["FIREBASE_CONFIG"],
    }

    p = subprocess.run(
        ["npm", "run", "build"],
        env={
            **os.environ,
            **frontend_env,
        },
    )
    p.check_returncode()

    p = subprocess.run(["firebase", "use", f"choonify-{stage}"])
    p.check_returncode()

    p = subprocess.run(
        ["firebase", "deploy", "--only", f"hosting:{stage},firestore:rules,storage"]
    )
    p.check_returncode()


if __name__ == "__main__":
    main()
