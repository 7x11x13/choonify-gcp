import contextlib
import subprocess
from pathlib import Path
from typing import Literal, TypeAlias

BuildStage: TypeAlias = Literal["dev"] | Literal["prod"]


def get_project_id(stage: BuildStage) -> str:
    return {
        "dev": "choonify-dev",
        "prod": "choonify-production",
    }[stage]


def get_tf_output(stage: BuildStage, name: str) -> str:
    tf_dir = Path(__file__).parent / "infra" / stage
    with contextlib.chdir(tf_dir):
        p = subprocess.run(
            ["terraform", "output", "-raw", name],
            capture_output=True,
        )
        p.check_returncode()
        return p.stdout.decode()
