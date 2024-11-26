# dataproc_jupyter_plugin/flag.py

# This is a simple module to store the verterai flag
# Initialized with a default value
VERTEX_PLATFORM_ENABLED = False


def _parse_vertexai_flag():
    """
    Parse the vertexai flag from command-line arguments

    This function will be called during extension loading
    """
    global VERTEX_PLATFORM_ENABLED
    import sys

    for arg in sys.argv:
        if arg.startswith("--isVertexPlatform="):
            VERTEX_PLATFORM_ENABLED = arg.split("=")[1].lower() == "true"
            break

    return VERTEX_PLATFORM_ENABLED
