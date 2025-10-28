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

# Define source directories
PLUGIN_SRC_DIR="${KOKORO_ARTIFACTS_DIR}/github/dataproc-jupyter-plugin"
SPARKMONITOR_G3_DIR="${KOKORO_ARTIFACTS_DIR}/piper/google3/third_party/javascript/sparkmonitor"

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

# --- Build and Stage Sparkmonitor from Piper using npm ---
cd "${SPARKMONITOR_G3_DIR}"

# Clean up any previous npm/node artifacts in sparkmonitor dir
rm -rf node_modules lib labextension

# Install Node.js dependencies for sparkmonitor using npm
npm install

# Build the sparkmonitor lib and then the JupyterLab extension using npm run
npm run build:lib:prod
npm run build:labextension

# Stage sparkmonitor artifacts into the plugin source directory
SPARKMONITOR_ARTIFACTS_DIR="${SPARKMONITOR_G3_DIR}/labextension"
PLUGIN_STAGING_DIR="${PLUGIN_SRC_DIR}/sparkmonitor_labextension_staging"

rm -rf "${PLUGIN_STAGING_DIR}"
mkdir -p "${PLUGIN_STAGING_DIR}"
cp -a "${SPARKMONITOR_ARTIFACTS_DIR}/." "${PLUGIN_STAGING_DIR}/"

# Copy Sparkmonitor LICENSE for third-party compliance
cp "${SPARKMONITOR_G3_DIR}/LICENSE" "${PLUGIN_SRC_DIR}/SPARKMONITOR_LICENSE"

# --- End Sparkmonitor Build and Stage ---

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
