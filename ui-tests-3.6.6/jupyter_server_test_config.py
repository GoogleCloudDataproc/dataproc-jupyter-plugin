# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Server configuration for integration tests.

!! Never use this configuration in production because it
opens the server to the world and provide access to JupyterLab
JavaScript objects through the global window variable.
"""
from tempfile import mkdtemp

c.ServerApp.port = 8888  # noqa: F821
c.ServerApp.port_retries = 0  # noqa: F821
c.ServerApp.open_browser = False  # noqa: F821

c.ServerApp.root_dir = mkdtemp(prefix="galata-test-")  # noqa: F821
c.ServerApp.token = ""  # noqa: F821
c.ServerApp.password = ""  # noqa: F821
c.ServerApp.disable_check_xsrf = True  # noqa: F821
c.LabApp.expose_app_in_browser = True  # noqa: F821