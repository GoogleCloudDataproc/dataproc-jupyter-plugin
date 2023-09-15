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
sudo apt-get --assume-yes install python3 python3-pip nodejs

# Install jupyter lab and build.
pip install jupyterlab build

# Navigate to repo.
cd "${KOKORO_ARTIFACTS_DIR}/github/dataproc-jupyter-plugin"

# Install the plugin
pip3 install -e ".[test]"
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Server extension must be manually installed in develop mode
jupyter server extension enable dataproc_jupyter_plugin
# Rebuild extension Typescript source after making changes
jlpm build
# Aslo build python packages to dist/
python -m build

# Run Playwright Tests
cd ./ui-tests
jlpm install
jlpm playwright install
PLAYWRIGHT_JUNIT_OUTPUT_NAME=test-results/sponge_log.xml jlpm playwright test --reporter=junit
