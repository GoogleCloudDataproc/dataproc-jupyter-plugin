/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * One-shot request to open the Google Cloud Settings widget on its Spark
 * (runtime profiles) tab.
 *
 * The runtime profile form navigates to the listing page after a profile is
 * created. When the Settings widget is already open it is told to switch tabs
 * through an event; when it has to be opened first, its layout mounts after
 * that event has fired, so the request is parked here and consumed by the
 * layout when it mounts.
 */
let runtimeProfileListTabRequested = false;

/** Asks the next Settings layout to mount on the Spark tab. */
export const requestRuntimeProfileListTab = (): void => {
  runtimeProfileListTabRequested = true;
};

/** Returns whether the Spark tab was requested, and clears the request. */
export const consumeRuntimeProfileListTabRequest = (): boolean => {
  const requested = runtimeProfileListTabRequested;
  runtimeProfileListTabRequested = false;
  return requested;
};
