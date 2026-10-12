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

jest.mock('../handler/handler', () => ({
  requestAPI: jest.fn().mockResolvedValue({
    dataproc_url: 'https://dataproc.googleapis.com/',
    compute_url: 'https://compute.googleapis.com/compute',
    metastore_url: 'https://metastore.googleapis.com/',
    cloudkms_url: 'https://cloudkms.googleapis.com/',
    cloudresourcemanager_url: 'https://cloudresourcemanager.googleapis.com/',
    datacatalog_url: 'https://datacatalog.googleapis.com/',
    storage_url: 'https://storage.googleapis.com/'
  })
}));

import {
  extractRuntimeVersion,
  sanitizeSessionTemplateId,
  parseMachineTypeSpec,
  parseDiskSpec,
  mapRuntimeProfileToSessionTemplate,
  getDefaultLakehouseCatalogName,
  ISessionTemplateApiPayload,
  LAKEHOUSE_CATALOG_PROPERTY_PREFIX,
  LAKEHOUSE_DEFAULT_CATALOG_PROPERTY,
  LAKEHOUSE_PROJECT_PROPERTY,
  LAKEHOUSE_RUNTIME_CATALOG
} from './runtimeProfileMapper';
import {
  ICreateRuntimeProfilePayload,
  IMetastoreConfig
} from './runtimeProfileInterface';
import {
  DATAPROC_LIGHTNING_ENGINE_PROPERTY,
  DATAPROC_TIER_PROPERTY
} from '../utils/const';

describe('runtimeProfileMapper', () => {
  describe('extractRuntimeVersion', () => {
    it('should extract major.minor version from complex version label', () => {
      expect(
        extractRuntimeVersion('2.3 LTS (Spark 3.5.1, Python 3.12, Scala 2.13)')
      ).toBe('2.3');
      expect(extractRuntimeVersion('2.1')).toBe('2.1');
    });

    it('should return undefined for empty, whitespace-only, or None', () => {
      expect(extractRuntimeVersion('')).toBeUndefined();
      expect(extractRuntimeVersion('   ')).toBeUndefined();
      expect(extractRuntimeVersion(' None ')).toBeUndefined();
      expect(extractRuntimeVersion('None')).toBeUndefined();
      expect(extractRuntimeVersion(undefined)).toBeUndefined();
    });
  });

  describe('sanitizeSessionTemplateId', () => {
    it('should generate lower-case hyphenated ids', () => {
      expect(sanitizeSessionTemplateId('My Custom Profile!')).toBe(
        'my-custom-profile'
      );
      expect(sanitizeSessionTemplateId('', 'preferred-id-123')).toBe(
        'preferred-id-123'
      );
    });

    it('should prefix ids that do not start with a letter', () => {
      expect(sanitizeSessionTemplateId('1st Finance Profile')).toBe(
        'runtime-1st-finance-profile'
      );
      expect(sanitizeSessionTemplateId('', '2024-profile')).toBe(
        'runtime-2024-profile'
      );
    });
  });

  describe('parseMachineTypeSpec', () => {
    it('should parse known machine types', () => {
      expect(parseMachineTypeSpec('standard-4')).toEqual({
        cores: 4,
        memory: '16g'
      });
      expect(parseMachineTypeSpec('Highmem-8')).toEqual({
        cores: 8,
        memory: '64g'
      });
      expect(parseMachineTypeSpec('l4-8')).toEqual({
        cores: 8,
        memory: '26768m',
        acceleratorType: 'l4'
      });
    });

    it('should parse machine type labels', () => {
      expect(parseMachineTypeSpec('highmem-4 (4 vCPU, 32 GB)')).toEqual({
        cores: 4,
        memory: '32g'
      });
    });

    it('should parse dynamic machine types', () => {
      expect(parseMachineTypeSpec('n2-standard-32')).toEqual({
        cores: 32,
        memory: '128g'
      });
    });

    it('should return undefined for empty or invalid machine type', () => {
      expect(parseMachineTypeSpec('')).toBeUndefined();
      expect(parseMachineTypeSpec(undefined)).toBeUndefined();
    });
  });

  describe('parseDiskSpec', () => {
    it('should parse standard and premium disk types and pass through specified sizes', () => {
      expect(parseDiskSpec('standard persistent disk')).toEqual({
        tier: 'standard',
        size: '400g'
      });
      expect(parseDiskSpec('Standard persistent disk (HDD), 100 GB')).toEqual({
        tier: 'standard',
        size: '100g'
      });
      expect(parseDiskSpec('SSD persistent disk (SSD), 500 GB')).toEqual({
        tier: 'premium',
        size: '500g'
      });
      // Numbers without a size unit must not be parsed as disk size
      expect(parseDiskSpec('pd-standard-2')).toEqual({
        tier: 'standard',
        size: '400g'
      });
    });
  });

  describe('mapRuntimeProfileToSessionTemplate', () => {
    it('should map complete ICreateRuntimeProfilePayload to SessionTemplate payload', () => {
      const payload: ICreateRuntimeProfilePayload = {
        displayName: 'Finance Analytics Profile',
        region: 'us-central1',
        description: 'Profile for finance team',
        tier: 'Premium',
        lightningEngineEnabled: true,
        runtimeEnvironmentConfig: {
          runtimeProfileId: 'finance-profile-id',
          runtimeVersion: '2.3 LTS (Spark 3.5.1, Python 3.12)',
          customSparkImage: 'gcr.io/my-project/spark-image:latest',
          pythonPackageRepository: 'https://pypi.org/simple'
        },
        executorAndDriverConfig: {
          tier: 'Premium',
          driverMachineType: 'standard-4',
          driverDisk: 'standard persistent disk',
          executorType: 'standard',
          executorDisk: 'Standard persistent disk (HDD), 100 GB'
        },
        autoscalingConfig: {
          autoscalingEnabled: true,
          initialExecutors: 2,
          minExecutors: 1,
          maxExecutors: 8
        },
        sparkProperties: {
          'spark.sql.shuffle.partitions': '200'
        },
        labels: {
          env: 'production',
          cost_center: 'finance'
        }
      };

      const result = mapRuntimeProfileToSessionTemplate(
        payload,
        'test-project',
        'us-central1'
      );

      expect(result.name).toBe(
        'projects/test-project/locations/us-central1/sessionTemplates/finance-profile-id'
      );
      expect(result.description).toBe('Profile for finance team');
      expect(result.jupyterSession).toEqual({
        kernel: 'PYTHON',
        displayName: 'Finance Analytics Profile'
      });
      expect(result.labels).toEqual({
        env: 'production',
        cost_center: 'finance'
      });

      // Runtime config
      expect(result.runtimeConfig?.version).toBe('2.3');
      expect(result.runtimeConfig?.containerImage).toBe(
        'gcr.io/my-project/spark-image:latest'
      );
      expect(
        result.runtimeConfig?.repositoryConfig?.pypiRepositoryConfig
          ?.pypiRepository
      ).toBe('https://pypi.org/simple');
      expect(result.runtimeConfig?.properties?.[DATAPROC_TIER_PROPERTY]).toBe(
        'premium'
      );
      expect(
        result.runtimeConfig?.properties?.[DATAPROC_LIGHTNING_ENGINE_PROPERTY]
      ).toBe('lightningEngine');
      expect(
        result.runtimeConfig?.properties?.['spark.dynamicAllocation.enabled']
      ).toBe('true');
      expect(
        result.runtimeConfig?.properties?.[
          'spark.dynamicAllocation.initialExecutors'
        ]
      ).toBe('2');
      expect(
        result.runtimeConfig?.properties?.[
          'spark.dynamicAllocation.minExecutors'
        ]
      ).toBe('1');
      expect(
        result.runtimeConfig?.properties?.[
          'spark.dynamicAllocation.maxExecutors'
        ]
      ).toBe('8');
      expect(
        result.runtimeConfig?.properties?.['spark.sql.shuffle.partitions']
      ).toBe('200');

      // Driver & Executor machine type and disk properties
      expect(result.runtimeConfig?.properties?.['spark.driver.cores']).toBe(
        '4'
      );
      expect(result.runtimeConfig?.properties?.['spark.driver.memory']).toBe(
        '16g'
      );
      expect(
        result.runtimeConfig?.properties?.['spark.dataproc.driver.disk.tier']
      ).toBe('standard');
      expect(
        result.runtimeConfig?.properties?.['spark.dataproc.driver.disk.size']
      ).toBe('400g');
      expect(
        result.runtimeConfig?.properties?.['spark.dataproc.executor.disk.tier']
      ).toBe('standard');
      expect(
        result.runtimeConfig?.properties?.['spark.dataproc.executor.disk.size']
      ).toBe('100g');
    });

    it('should map accelerated executor machine type and SSD executor disk to properties', () => {
      const payload: ICreateRuntimeProfilePayload = {
        displayName: 'Accelerated ML Profile',
        region: 'us-central1',
        tier: 'Premium',
        executorConfig: {
          executorType: 'accelerated',
          machineType: 'l4-4'
        },
        executorAndDriverConfig: {
          driverMachineType: 'standard-8',
          driverDisk: 'SSD persistent disk, 500 GB',
          executorType: 'l4-4',
          executorDisk: 'SSD persistent disk (SSD), 200 GB'
        }
      };

      const result = mapRuntimeProfileToSessionTemplate(
        payload,
        'test-project',
        'us-central1'
      );

      const props = result.runtimeConfig?.properties;
      expect(props?.['spark.driver.cores']).toBe('8');
      expect(props?.['spark.driver.memory']).toBe('32g');
      expect(props?.['spark.dataproc.driver.disk.tier']).toBe('premium');
      expect(props?.['spark.dataproc.driver.disk.size']).toBe('500g');

      expect(props?.['spark.executor.cores']).toBe('4');
      expect(props?.['spark.executor.memory']).toBe('13384m');
      expect(props?.['spark.dataproc.executor.compute.tier']).toBe('premium');
      expect(props?.['spark.dataproc.executor.resource.accelerator.type']).toBe(
        'l4'
      );
      expect(props?.['spark.dataproc.executor.disk.tier']).toBe('premium');
      expect(props?.['spark.dataproc.executor.disk.size']).toBe('200g');
    });

    it('should automatically set spark.dataproc.executor.compute.tier to premium for highmem shapes', () => {
      const payload: ICreateRuntimeProfilePayload = {
        displayName: 'Highmem Profile',
        region: 'us-central1',
        tier: 'Standard',
        executorConfig: {
          executorType: 'general',
          machineType: 'highmem-4'
        }
      };

      const result = mapRuntimeProfileToSessionTemplate(
        payload,
        'test-project',
        'us-central1'
      );

      const props = result.runtimeConfig?.properties;
      expect(props?.['spark.executor.cores']).toBe('4');
      expect(props?.['spark.executor.memory']).toBe('32g');
      // Highmem shape has 8 GB RAM per core, so it must set premium compute tier
      expect(props?.['spark.dataproc.executor.compute.tier']).toBe('premium');
    });

    it('should let user sparkProperties override derived autoscaling values', () => {
      const payload: ICreateRuntimeProfilePayload = {
        displayName: 'Override Profile',
        region: 'us-central1',
        tier: 'Premium',
        autoscalingConfig: {
          autoscalingEnabled: true,
          minExecutors: 2,
          maxExecutors: 20
        },
        sparkProperties: {
          'spark.dynamicAllocation.maxExecutors': '50',
          [DATAPROC_TIER_PROPERTY]: 'standard'
        }
      };

      const props = mapRuntimeProfileToSessionTemplate(
        payload,
        'test-project',
        'us-central1'
      ).runtimeConfig?.properties;

      // User-provided value wins over the autoscaling form value
      expect(props?.['spark.dynamicAllocation.maxExecutors']).toBe('50');
      // Keys not provided by the user are still derived from the form
      expect(props?.['spark.dynamicAllocation.minExecutors']).toBe('2');
      expect(props?.['spark.dynamicAllocation.enabled']).toBe('true');
      // Tier is an explicit UI control and intentionally overrides sparkProperties
      expect(props?.[DATAPROC_TIER_PROPERTY]).toBe('premium');
    });

    describe('metastore configuration', () => {
      const mapMetastore = (
        metastoreConfig: IMetastoreConfig,
        extra: Partial<ICreateRuntimeProfilePayload> = {}
      ): ISessionTemplateApiPayload =>
        mapRuntimeProfileToSessionTemplate(
          {
            displayName: 'Metastore Profile',
            region: 'us-central1',
            metastoreConfig,
            ...extra
          },
          'test-project',
          'us-central1'
        );

      // Metastore-related runtime properties of a mapped payload.
      const metastoreProps = (result: ISessionTemplateApiPayload) =>
        Object.fromEntries(
          Object.entries(result.runtimeConfig?.properties ?? {}).filter(
            ([key]) =>
              key.includes('lakehouse') || key.startsWith('spark.sql.catalog')
          )
        );

      it('sends no metastore settings for the untouched default config', () => {
        const result = mapMetastore({
          metastore: '',
          hiveEndpointEnabled: false
        });

        expect(metastoreProps(result)).toEqual({});
        expect(result.environmentConfig).toBeUndefined();
      });

      it('maps a new default catalog with a custom name', () => {
        const result = mapMetastore({
          metastore: LAKEHOUSE_RUNTIME_CATALOG,
          metastoreType: 'lakehouse',
          icebergRestEndpointEnabled: true,
          catalogSelectionMode: 'new',
          catalogName: 'sales_catalog'
        });

        // No spark.sql.catalog.* properties: the service sets up the catalog.
        expect(metastoreProps(result)).toEqual({
          [LAKEHOUSE_PROJECT_PROPERTY]: 'test-project',
          [`${LAKEHOUSE_CATALOG_PROPERTY_PREFIX}sales_catalog`]:
            'projects/test-project/catalogs/sales_catalog',
          [LAKEHOUSE_DEFAULT_CATALOG_PROPERTY]: 'sales_catalog'
        });
      });

      it("names the new default catalog after the profile's region when no name is saved", () => {
        const result = mapMetastore(
          {
            metastoreType: 'lakehouse',
            icebergRestEndpointEnabled: true,
            catalogSelectionMode: 'new'
          },
          { region: 'europe-west1' }
        );

        expect(getDefaultLakehouseCatalogName('europe-west1')).toBe(
          'standard-lh-catalog-europe-west1'
        );
        expect(
          result.runtimeConfig?.properties?.[LAKEHOUSE_DEFAULT_CATALOG_PROPERTY]
        ).toBe('standard-lh-catalog-europe-west1');
      });

      it('maps an existing catalog in another project as the default catalog', () => {
        const result = mapMetastore({
          metastoreType: 'lakehouse',
          icebergRestEndpointEnabled: true,
          catalogSelectionMode: 'existing',
          catalogId: 'my_catalog',
          projectId: 'custom-project'
        });

        expect(metastoreProps(result)).toEqual({
          [LAKEHOUSE_PROJECT_PROPERTY]: 'custom-project',
          [`${LAKEHOUSE_CATALOG_PROPERTY_PREFIX}my_catalog`]:
            'projects/custom-project/catalogs/my_catalog',
          [LAKEHOUSE_DEFAULT_CATALOG_PROPERTY]:
            'projects/custom-project/catalogs/my_catalog'
        });
      });

      it('uses only the Hive fields when only the Hive endpoint is enabled', () => {
        // Hidden Iceberg values must not leak into a Hive-only payload.
        const result = mapMetastore({
          metastoreType: 'lakehouse',
          icebergRestEndpointEnabled: false,
          projectId: 'hidden-iceberg-project',
          catalogSelectionMode: 'existing',
          catalogId: 'hidden_catalog',
          hiveEndpointEnabled: true,
          hiveProjectId: 'analytics-prod',
          hiveCatalogId: 'shared-hive-catalog',
          hiveCatalogName: 'shared_hive'
        });

        expect(metastoreProps(result)).toEqual({
          [LAKEHOUSE_PROJECT_PROPERTY]: 'analytics-prod',
          [`${LAKEHOUSE_CATALOG_PROPERTY_PREFIX}shared_hive`]:
            'projects/analytics-prod/catalogs/shared-hive-catalog'
        });
      });

      it('registers the Hive catalog without changing the Iceberg default catalog', () => {
        const result = mapMetastore({
          metastoreType: 'lakehouse',
          icebergRestEndpointEnabled: true,
          catalogSelectionMode: 'new',
          catalogName: 'default_catalog',
          hiveEndpointEnabled: true,
          hiveProjectId: 'hive-project',
          hiveCatalogName: 'hive_alias'
        });
        const props = result.runtimeConfig?.properties;

        expect(props?.[LAKEHOUSE_PROJECT_PROPERTY]).toBe('test-project');
        expect(props?.[LAKEHOUSE_DEFAULT_CATALOG_PROPERTY]).toBe(
          'default_catalog'
        );
        // Without a Hive catalog ID, the name is used as the ID.
        expect(props?.[`${LAKEHOUSE_CATALOG_PROPERTY_PREFIX}hive_alias`]).toBe(
          'projects/hive-project/catalogs/hive_alias'
        );
      });

      it("keeps the user's own Spark properties", () => {
        const result = mapMetastore(
          {
            metastoreType: 'lakehouse',
            icebergRestEndpointEnabled: true,
            catalogSelectionMode: 'new',
            catalogName: 'sales_catalog'
          },
          {
            sparkProperties: {
              [LAKEHOUSE_DEFAULT_CATALOG_PROPERTY]: 'user_catalog'
            }
          }
        );

        expect(
          result.runtimeConfig?.properties?.[LAKEHOUSE_DEFAULT_CATALOG_PROPERTY]
        ).toBe('user_catalog');
      });

      it('maps a Dataproc Metastore service to peripheralsConfig', () => {
        const service =
          'projects/test-project/locations/us-central1/services/my-dpms';
        const result = mapMetastore({
          metastoreType: 'dataproc',
          dataprocMetastoreService: service
        });

        expect(
          result.environmentConfig?.peripheralsConfig?.metastoreService
        ).toBe(service);
      });

      it('ignores Lakehouse values and sends no service for Dataproc Metastore with None', () => {
        const result = mapMetastore({
          metastoreType: 'dataproc',
          icebergRestEndpointEnabled: true,
          hiveEndpointEnabled: true,
          hiveCatalogName: 'leftover'
        });

        expect(metastoreProps(result)).toEqual({});
        expect(result.environmentConfig).toBeUndefined();
      });

      it('does not send a Dataproc Metastore service for the Lakehouse runtime catalog', () => {
        const result = mapMetastore({
          metastoreType: 'lakehouse',
          dataprocMetastoreService:
            'projects/test-project/locations/us-central1/services/leftover'
        });

        expect(result.environmentConfig).toBeUndefined();
      });
    });
  });
});
