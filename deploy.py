#!/usr/bin/env python3

import argparse
import contextlib
import copy
import json
import os
import subprocess
from typing import Literal, TypeAlias

BuildStage: TypeAlias = Literal["dev"] | Literal["prod"]


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


def parse_only_flag(only: str, skip: str) -> list[str]:
    valid_steps = ["tf", "vite", "firebase"]
    keep = {w.strip().lower() for w in only.split(",") if w}
    remove = {w.strip().lower() for w in skip.split(",") if w}
    ret = keep - remove
    if all(w in valid_steps for w in ret):
        return list(ret)
    raise ValueError(f"--only can only contain values from {valid_steps}")


def load_tf_env(stage: BuildStage) -> dict[str, str]:
    # expects:
    # "TF_VAR_billing_account"
    # "TF_VAR_google_client_id"
    # "TF_VAR_google_client_secret"
    # "TF_VAR_stripe_api_key"
    # "TF_VAR_stripe_webhook_secret" (optional)
    tf_env_file = f".env.tf.{stage}.json"
    with open(tf_env_file, "r") as f:
        return json.load(f)


def deploy_tf(stage: BuildStage, tf_env: dict[str, str]):
    def apply(tf_env: dict[str, str]):
        p = subprocess.run(
            ["terraform", "apply", "-auto-approve"],
            env={
                **os.environ,
                **tf_env,
            },
        )
        p.check_returncode()

    with contextlib.chdir(f"./infra/{stage}"):
        apply(tf_env)
        # hacky fix for circular dependency
        if not tf_env.get("TF_VAR_stripe_webhook_secret"):
            p = subprocess.run(
                ["terraform", "output", "-raw", "STRIPE_WEBHOOK_SECRET"],
                capture_output=True,
            )
            p.check_returncode()
            tf_env["TF_VAR_stripe_webhook_secret"] = p.stdout.decode()
            with open(f"../../.env.tf.{stage}.json", "w") as f:
                json.dump(tf_env, f, sort_keys=True, indent=4)
            apply(tf_env)


def build_api_env(stage: BuildStage, tf_env: dict[str, str]) -> dict[str, str]:
    with contextlib.chdir(f"./infra/{stage}"):
        p = subprocess.run(["terraform", "output", "-json"], capture_output=True)
    p.check_returncode()
    tf_outputs = {k: v["value"] for k, v in json.loads(p.stdout).items()}
    api_env = copy.deepcopy(tf_outputs)
    api_env["GIN_MODE"] = "debug"  # TODO: change for prod
    api_env["GOOGLE_REDIRECT_URL"] = "http://localhost:3000"  # TODO: change for prod
    for k, v in tf_env.items():
        k = k[len("TF_VAR_") :].upper()
        api_env[k] = v
    api_env["FIREBASE_CONFIG"] = convert_firebase_config(api_env["FIREBASE_CONFIG"])
    # save outputs to env file for local development
    if stage == "dev":
        with open(f".env.api.{stage}.json", "w") as f:
            json.dump(api_env, f, sort_keys=True, indent=4)
    return api_env


def build_frontend(api_env: dict[str, str]):
    frontend_env = {
        "NODE_ENV": "production",
        "VITE_LOCAL_BACKEND": "0",
        "VITE_GOOGLE_CLIENT_ID": api_env["GOOGLE_CLIENT_ID"],
        "VITE_FIREBASE_CONFIG": api_env["FIREBASE_CONFIG"],
    }

    with contextlib.chdir("./packages/frontend"):
        p = subprocess.run(
            ["npm", "run", "build"],
            env={
                **os.environ,
                **frontend_env,
            },
        )
        p.check_returncode()


def firebase_deploy(stage: BuildStage, api_env: dict[str, str]):
    with contextlib.chdir("./packages/frontend"):
        p = subprocess.run(["firebase", "use", f"choonify-{stage}"])
        p.check_returncode()

        with open("./functions/.env", "w") as f:
            f.write(
                "\n".join(
                    f"{k}={api_env[k]}"
                    for k in (
                        "GOOGLE_CLIENT_ID",
                        "GOOGLE_CLIENT_SECRET",
                        "GOOGLE_REDIRECT_URL",
                    )
                )
            )

        p = subprocess.run(
            [
                "firebase",
                "deploy",
                "--only",
                f"hosting:{stage},firestore:rules,storage,functions",
            ],
        )
        p.check_returncode()
        # for functions, go to firebase console -> authentication -> blocking functions
        # no way to automate afaict


def main():
    parser = argparse.ArgumentParser(
        prog="choonify deploy script",
    )
    parser.add_argument("--stage", default="dev")
    parser.add_argument("--only", default="tf,vite,firebase")
    parser.add_argument("--skip", default="")
    args = parser.parse_args()
    if args.stage not in ("dev", "prod"):
        raise ValueError("--stage must be dev or prod")
    stage = args.stage
    only = parse_only_flag(args.only, args.skip)
    print(f"Running steps: {', '.join(only)}")

    tf_env = load_tf_env(stage)

    if "tf" in only:
        deploy_tf(stage, tf_env)

    api_env = build_api_env(stage, tf_env)

    if "vite" in only:
        build_frontend(api_env)

    if "firebase" in only:
        firebase_deploy(stage, api_env)


if __name__ == "__main__":
    main()
