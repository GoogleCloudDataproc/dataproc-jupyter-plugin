#!/bin/bash

# Fail on any error.
set -e

# Display commands being run.
# WARNING: please only enable 'set -x' if necessary for debugging, and be very
#  careful if you handle credentials (e.g. from Keystore) with 'set -x':
#  statements like "export VAR=$(cat /tmp/keystore/credentials)" will result in
#  the credentials being printed in build logs.
#  Additionally, recursive invocation with credentials as command-line
#  parameters, will print the full command, with credentials, in the build logs.
# set -x

# Code under repo is checked out to ${KOKORO_ARTIFACTS_DIR}/github.
# The final directory name in this path is determined by the scm name specified
# in the job configuration.

export PATH="$HOME/.local/bin:$PATH"

# configure gcloud
gcloud config set project dataproc-kokoro-tests
gcloud config set compute/region us-central1

# Install dependencies.
sudo apt-get update
sudo apt-get --assume-yes install python3 python3-pip nodejs python3-venv

# Install latest jupyter lab and build.
python -m venv latest
source latest/bin/activate
pip install jupyterlab build

# Navigate to repo.
cd "${KOKORO_ARTIFACTS_DIR}/github/dataproc-jupyter-plugin"

# Rebuild extension Typescript source after making changes
jlpm install
jlpm build
# Aslo build python packages to dist/
python -m build

# install the build
pip install dist/*.whl
jupyter server extension enable dataproc_jupyter_plugin

# Run Playwright Tests for latest jupyter lab build
cd ./ui-tests
jlpm install
jlpm playwright install
PLAYWRIGHT_JUNIT_OUTPUT_NAME=test-results-latest/sponge_log.xml jlpm playwright test --reporter=junit --output="test-results-latest"
deactivate

# Test 3.6.6
cd "${KOKORO_ARTIFACTS_DIR}/github/dataproc-jupyter-plugin"
python -m venv version_366
source version_366/bin/activate
pip install  --force-reinstall "jupyterlab==3.6.6"
pip install dist/*.whl
jupyter server extension enable dataproc_jupyter_plugin
cd ./ui-tests-3.6.6
jlpm install
jlpm playwright install
PLAYWRIGHT_JUNIT_OUTPUT_NAME=test-results-3.6.6/sponge_log.xml jlpm playwright test --reporter=junit --output="test-results-3.6.6"
deactivate
