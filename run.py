#!/usr/bin/env python3

# run administrative tasks manually
import argparse
import json
import subprocess

from core import BuildStage, get_project_id, get_tf_output


def delete_user(stage: BuildStage, uid: str):
    data = {"userId": uid}
    p = subprocess.run(
        [
            "gcloud",
            "functions",
            "call",
            "delete",
            "--region",
            get_tf_output(stage, "REGION"),
            "--data",
            json.dumps(data),
        ]
    )
    p.check_returncode()


def main():
    parser = argparse.ArgumentParser(
        prog="choonify admin script",
    )
    parser.add_argument("--stage", default="dev", choices=("dev", "prod"))
    subparsers = parser.add_subparsers(required=True, dest="cmd")
    parser_delete = subparsers.add_parser("delete")
    parser_delete.add_argument("uid")
    args = parser.parse_args()
    stage = args.stage
    p = subprocess.run(["gcloud", "config", "set", "project", get_project_id(stage)])
    p.check_returncode()

    match args.cmd:
        case "delete":
            delete_user(stage, args.uid)


if __name__ == "__main__":
    main()
