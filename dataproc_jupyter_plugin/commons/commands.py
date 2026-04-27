# Copyright 2024 Google LLC
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


import asyncio
import subprocess
import sys
import tempfile


async def async_run_gsutil_subcommand(cmd):
    """Run a specified command and return its output."""
    def _run():
        return subprocess.run(
            cmd,
            shell=True,
            stdin=subprocess.DEVNULL,
            stderr=sys.stderr,
            stdout=subprocess.PIPE,
            text=True,
        )

    loop = asyncio.get_running_loop()
    p = await loop.run_in_executor(None, _run)

    if p.returncode != 0:
        raise subprocess.CalledProcessError(p.returncode, cmd, p.stdout, None)
    return p.stdout.strip()
