/**
 * @license
 * Copyright 2023 Google LLC
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
import type { Meta, StoryObj } from '@storybook/react';

import { EditSessionTemplateControl } from './EditSessionTemplateControl';

const meta: Meta<typeof EditSessionTemplateControl> = {
  component: EditSessionTemplateControl
};

export default meta;
type Story = StoryObj<typeof EditSessionTemplateControl>;

export const Empty: Story = {
  args: {
    //👇 The args you need here will depend on your component
  }
};

export const Existing: Story = {
  args: {
    template: {
      name: 'projects/demo-project/locations/us-central1/sessionTemplates/test-template',
      jupyterSession: {
        kernel: 'PYTHON',
        displayName: 'Test Template'
      },
      environmentConfig: {
        executionConfig: {
          networkUri: 'default',
          idleTtl: '3600s',
          /** @ts-ignore: Seems like the proto is incorrect */
          ttl: '86400s'
        },
        peripheralsConfig: {
          metastoreService:
            'projects/demo-project/locations/us-central1/services/metastore'
        }
      },
      description: 'Team Discovery Serverless Spark Runtime Template',
      labels: [{ key: 'client', value: 'dataproc-jupyter-plugin' }]
    }
  }
};
