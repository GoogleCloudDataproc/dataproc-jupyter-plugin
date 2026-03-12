import type { StorybookConfig } from '@storybook/react-webpack5';

import { join, dirname, resolve } from 'path';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, 'package.json')));
}
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-essentials'),
    getAbsolutePath('@storybook/addon-onboarding'),
    getAbsolutePath('@storybook/addon-interactions')
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-webpack5'),
    options: {}
  },
  docs: {
    autodocs: 'tag'
  },
  webpackFinal: async config => {
    if (config?.resolve) {
      config.resolve.modules = [
        ...(config.resolve.modules || []),
        resolve(__dirname, '../src')
      ];
      config.resolve.alias = {
        ...config.resolve.alias,
        '../utils/utils': require.resolve('../__mocks__/utils.ts'),
        'utils/utils': require.resolve('../__mocks__/utils.ts'),
        'style': resolve(__dirname, '../style')
      };
    }
    return config;
  }
};
export default config;
