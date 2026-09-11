# Dataproc Jupyter Plugin

[![PyPI version](https://img.shields.io/pypi/v/dataproc_jupyter_plugin.svg)](https://pypi.org/project/dataproc_jupyter_plugin/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

A JupyterLab extension for working with [Google Cloud Dataproc](https://cloud.google.com/dataproc)
and [BigQuery](https://cloud.google.com/bigquery) directly from your notebook environment.

The extension is composed of two parts:

- a Python package named `dataproc_jupyter_plugin` that provides the Jupyter **server** extension, and
- an NPM package named `dataproc_jupyter_plugin` that provides the JupyterLab **frontend** extension.

## Features

From the JupyterLab launcher and menus, the plugin lets you:

- **Dataproc Serverless** – create and run Spark batches (serverless notebooks) and browse batch details.
- **Runtime Templates** – create, list, and manage serverless runtime templates.
- **Clusters** – view Dataproc clusters and submit/track jobs.
- **BigQuery Dataset Explorer** – browse datasets, tables, and schemas, and open BigQuery DataFrames notebooks.
- **Dataproc Metastore (DPMS)** – explore metastore catalogs, databases, and tables.
- **Notebook Templates** – start from curated example notebooks.
- **Spark monitoring** – bundled Spark monitor for tracking Spark jobs from within notebooks.

## Requirements

- **JupyterLab** `>= 3.6.0, < 5`
- The **[Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install)** installed and on your `PATH`.
- A Google Cloud project with the relevant APIs enabled (Dataproc, BigQuery, Cloud Resource Manager,
  and Dataproc Metastore, depending on which features you use). The UI will prompt you to enable an
  API if it detects it is disabled.

## Prerequisites: authenticate with Google Cloud

The plugin reads your active project, region, and access token from your local `gcloud`
configuration. **Before launching JupyterLab**, authenticate and set defaults:

```bash
# Log in and create Application Default Credentials
gcloud auth login

# Set your project
gcloud config set project <PROJECT_ID>

# Set a default Dataproc region (falls back to compute/region if unset)
gcloud config set dataproc/region <REGION>
# e.g. gcloud config set dataproc/region us-central1
```

If the project/region are not configured, or you are not logged in, the plugin surfaces a
configuration or login error in the **Google Cloud Settings** panel instead of loading data.

## Install

```bash
pip install dataproc_jupyter_plugin
```

## Configuration

### Frontend settings

Available under **Settings → Dataproc Jupyter Plugin** (or the Google Cloud Settings panel):

| Setting     | Default | Description                                        |
| ----------- | ------- | -------------------------------------------------- |
| `bqRegion`  | `US`    | The BigQuery region used by the Dataset Explorer.  |

### Server (Jupyter) configuration

These options are set on the Jupyter server, e.g. in `jupyter_server_config.py` or on the
command line as `--DataprocPluginConfig.<option>=<value>`:

| Option                          | Type   | Default                                | Description                                                                             |
| ------------------------------- | ------ | -------------------------------------- | --------------------------------------------------------------------------------------- |
| `enable_bigquery_integration`   | bool   | `False`                                | Enable the BigQuery Dataset Explorer integration.                                        |
| `enable_metastore_integration`  | bool   | `False`                                | Enable the Dataproc Metastore (DPMS) integration.                                        |
| `kernel_gateway_project_number` | str    | `""`                                   | Use this project number for the kernel gateway and skip project-number verification.     |
| `log_path`                      | str    | `""`                                   | If set, write server and plugin logs to a rotating file at this path.                     |
| `custom_user_agent`             | str    | `dataproc-jupyter-plugin/<version>`    | Custom `User-Agent` header for outbound requests to the kernels mixer.                    |

Example:

```python
# jupyter_server_config.py
c.DataprocPluginConfig.enable_bigquery_integration = True
c.DataprocPluginConfig.enable_metastore_integration = True
```

## Troubleshooting

### Data is not loading / "login" or "configuration" error

The most common issue is that `gcloud` is not authenticated or is missing a project/region.
Verify your configuration:

```bash
gcloud auth list          # confirm an active account
gcloud config get project # confirm a project is set
gcloud config get dataproc/region   # or: gcloud config get compute/region
```

Then restart JupyterLab so the plugin re-reads the configuration.

### "API has not been used / is not enabled"

The plugin checks whether the Dataproc, BigQuery, and Cloud Resource Manager APIs are enabled and
will prompt you to enable them. Enable the reported API in the Google Cloud console (or with
`gcloud services enable <api>`) and restart the instance.

### The frontend extension is not working

If you can see the frontend extension but it is not working, check that the **server** extension is
enabled:

```bash
jupyter server extension list
```

If the server extension is installed and enabled but you do not see the **frontend** extension,
check that it is installed:

```bash
jupyter labextension list
```

## Uninstall

```bash
pip uninstall dataproc_jupyter_plugin
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for the Contributor License
Agreement, local development setup, and testing instructions. Packaging and release steps are
documented in [RELEASE.md](RELEASE.md).
