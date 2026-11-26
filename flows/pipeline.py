"""Orchestration : récupération des données, évaluation, promotion."""

import subprocess
import sys

from prefect import flow, task


def run(*cmd):
    subprocess.run(cmd, check=True)


@task
def pull_data():
    run("dvc", "pull")


@task(timeout_seconds=3600)
def evaluate():
    run("dvc", "repro", "evaluate")


@task(retries=3, retry_delay_seconds=60)  # erreur passagère : serveur MLflow
def promote():
    run(sys.executable, "scripts/promote.py")


@flow(log_prints=True)
def agrivision_pipeline():
    pull_data()
    evaluate()
    promote()


if __name__ == "__main__":
    agrivision_pipeline()
