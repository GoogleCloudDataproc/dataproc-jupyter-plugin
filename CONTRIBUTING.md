# How to Contribute

We would love to accept your patches and contributions to this project.

## Before you begin

### Sign our Contributor License Agreement

Contributions to this project must be accompanied by a
[Contributor License Agreement](https://cla.developers.google.com/about) (CLA).
You (or your employer) retain the copyright to your contribution; this simply
gives us permission to use and redistribute your contributions as part of the
project.

If you or your current employer have already signed the Google CLA (even if it
was for a different project), you probably don't need to do it again.

Visit <https://cla.developers.google.com/> to see your current agreements or to
sign a new one.

### Review our Community Guidelines

This project follows [Google's Open Source Community
Guidelines](https://opensource.google/conduct/).

## Contribution process

### Code Reviews

All submissions, including submissions by project members, require review. We
use [GitHub pull requests](https://docs.github.com/articles/about-pull-requests)
for this purpose.

## Development install

> **Note:** You will need [NodeJS](https://nodejs.org/) to build the extension package.

The `jlpm` command is JupyterLab's pinned version of [yarn](https://yarnpkg.com/) that is
installed with JupyterLab. You may use `yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment, then change into the
# dataproc_jupyter_plugin directory.

# Install the package in development mode
pip install -e ".[test]"
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Enable the server extension (must be done manually in develop mode)
jupyter server extension enable dataproc_jupyter_plugin
# Rebuild the extension's TypeScript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to
automatically rebuild the extension on change:

```bash
# Terminal 1: watch the source directory and rebuild on change
jlpm watch
# Terminal 2: run JupyterLab
jupyter lab
```

With `jlpm watch` running, every saved change is rebuilt locally and made available in your running
JupyterLab. Refresh JupyterLab to load the change in your browser (it may take several seconds for
the extension to rebuild).

By default, `jlpm build` generates source maps for this extension to make debugging with the browser
dev tools easier. To also generate source maps for the JupyterLab core extensions, run:

```bash
jupyter lab build --minimize=False
```

## Development uninstall

```bash
# Disable the server extension (must be done manually in develop mode)
jupyter server extension disable dataproc_jupyter_plugin
pip uninstall dataproc_jupyter_plugin
```

In development mode you will also need to remove the symlink created by
`jupyter labextension develop`. To find its location, run `jupyter labextension list` to figure out
where the `labextensions` folder is located, then remove the symlink named `dataproc_jupyter_plugin`
within that folder.

## Testing the extension

### Server tests

This extension uses [Pytest](https://docs.pytest.org/) for Python code testing.

Install the test dependencies (needed only once):

```sh
pip install -e ".[test]"
# Each time you install the Python package, restore the front-end extension link
jupyter labextension develop . --overwrite
```

Run the tests:

```sh
pytest -vv -r ap --cov dataproc_jupyter_plugin
```

### Frontend tests

This extension uses [Jest](https://jestjs.io/) for JavaScript code testing:

```sh
jlpm
jlpm test
```

### Integration tests

This extension uses [Playwright](https://playwright.dev/docs/intro/) for the integration
(user-level) tests. More precisely, the JupyterLab helper
[Galata](https://github.com/jupyterlab/jupyterlab/tree/master/galata) is used to test the extension
in JupyterLab. See the [ui-tests README](./ui-tests/README.md) for details.

## Packaging and releasing

See [RELEASE.md](RELEASE.md).
