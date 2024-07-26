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
    with tempfile.TemporaryFile() as t:
        p = await asyncio.create_subprocess_shell(
            f"{cmd}",
            stdin=subprocess.DEVNULL,
            stderr=sys.stderr,
            stdout=t,
        )
        await p.wait()
        if p.returncode != 0:
            raise subprocess.CalledProcessError(p.returncode, None, None, None)
        t.seek(0)
        return t.read().decode("UTF-8").strip()
