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
  mapRuntimeProfileToSessionTemplateUpdate,
  mapSessionTemplateToFormValues,
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
import { IRuntimeProfileTemplate } from './runtimeProfileListMapper';
import {
  DATAPROC_LIGHTNING_ENGINE_PROPERTY,
  DATAPROC_TIER_PROPERTY,
  DEFAULT_ACCELERATED_EXECUTOR_TYPE,
  DEFAULT_GENERAL_EXECUTOR_TYPE,
  DEFAULT_STANDARD_TIER_EXECUTOR_TYPE
} from '../utils/const';

// Session templates shared by the update tests.

// Created by the form and saved with every section set.
const savedProfile = {
  name: 'projects/test-project/locations/us-central1/sessionTemplates/my_profile',
  description: 'old description',
  creator: 'user@example.com',
  createTime: '2026-09-16T08:02:03Z',
  updateTime: '2026-09-16T08:02:03Z',
  uuid: 'f2b6c0de-1234-4abc-8def-000000000000',
  jupyterSession: { displayName: 'Old name', kernel: 'SCALA' },
  environmentConfig: {
    executionConfig: {
      subnetworkUri: 'default',
      networkTags: ['old-tag'],
      kmsKey:
        'projects/test-project/locations/us-central1/keyRings/kr/cryptoKeys/k',
      serviceAccount: 'old-sa@test-project.iam.gserviceaccount.com',
      stagingBucket: 'old-bucket',
      idleTtl: '3600s',
      ttl: '259200s'
    },
    peripheralsConfig: {
      metastoreService:
        'projects/test-project/locations/us-central1/services/old-metastore',
      sparkHistoryServerConfig: {
        dataprocCluster:
          'projects/test-project/regions/us-central1/clusters/phs'
      }
    }
  },
  runtimeConfig: {
    version: '2.2',
    containerImage: 'gcr.io/my-project/old:1',
    properties: {
      [DATAPROC_TIER_PROPERTY]: 'premium',
      [DATAPROC_LIGHTNING_ENGINE_PROPERTY]: 'lightningEngine',
      'spark.executor.cores': '4',
      'spark.executor.memory': '32g',
      'spark.dataproc.executor.compute.tier': 'premium',
      'spark.dynamicAllocation.enabled': 'true',
      'spark.dynamicAllocation.initialExecutors': '2',
      'spark.dynamicAllocation.minExecutors': '2',
      'spark.dynamicAllocation.maxExecutors': '10',
      'spark.sql.shuffle.partitions': '100'
    },
    autotuningConfig: { scenarios: ['SCALING'] }
  },
  labels: { env: 'dev' }
} as IRuntimeProfileTemplate;

// Created in the Console: no tier, executor or autoscaling properties.
const consoleProfile: IRuntimeProfileTemplate = {
  name: 'projects/test-project/locations/us-central1/sessionTemplates/console',
  jupyterSession: { displayName: 'Console profile', kernel: 'PYTHON' },
  runtimeConfig: { version: '2.3' },
  environmentConfig: { executionConfig: { subnetworkUri: 'default' } }
};

// Values the form can't show: a custom executor shape, a non-numeric
// autoscaling limit, an unknown Lightning Engine value, prefixed keys and a
// network without a subnetwork.
const unusualProfile: IRuntimeProfileTemplate = {
  name: 'projects/test-project/locations/us-central1/sessionTemplates/unusual',
  jupyterSession: { displayName: 'Unusual', kernel: 'PYTHON' },
  environmentConfig: { executionConfig: { networkUri: 'custom-vpc' } },
  runtimeConfig: {
    properties: {
      'dataproc:dataproc.tier': 'standard',
      [DATAPROC_LIGHTNING_ENGINE_PROPERTY]: 'default',
      'spark:spark.executor.cores': '6',
      'spark:spark.executor.memory': '20g',
      'spark.dataproc.driver.disk.size': '1t',
      'spark.dynamicAllocation.maxExecutors': 'unlimited',
      'spark:spark.sql.adaptive.enabled': 'true'
    }
  }
};

// A Shared VPC subnetwork, a key from another project entered by hand, and
// runtime 3.0 without an authentication type (end-user credentials).
const sharedVpcProfile: IRuntimeProfileTemplate = {
  name: 'projects/test-project/locations/us-central1/sessionTemplates/shared',
  jupyterSession: { displayName: 'Shared', kernel: 'PYTHON' },
  runtimeConfig: { version: '3.0' },
  environmentConfig: {
    executionConfig: {
      subnetworkUri:
        'projects/host-project/regions/us-central1/subnetworks/shared-subnet',
      kmsKey: 'projects/kms-project/locations/global/keyRings/kr/cryptoKeys/k'
    }
  }
};

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

    it('should map serviceAccount, shared VPC subnetwork with hostProjectId, and KMS keyRing/cryptoKey', () => {
      const payload: ICreateRuntimeProfilePayload = {
        displayName: 'Network Security Profile',
        region: 'us-central1',
        networkAndSecurityConfig: {
          networkSource: 'shared_from_host',
          sharedSubnetwork: 'shared-subnet-1',
          hostProjectId: 'host-vpc-project',
          executionIdentity: 'service_account',
          serviceAccount: 'custom-sa@test-project.iam.gserviceaccount.com',
          encryption: 'customer_managed_key',
          kmsKeySelectionMode: 'select',
          keyRing: 'my-key-ring',
          cryptoKey: 'my-crypto-key'
        }
      };

      const result = mapRuntimeProfileToSessionTemplate(
        payload,
        'test-project',
        'us-central1'
      );

      const execConfig = result.environmentConfig?.executionConfig;
      expect(execConfig?.subnetworkUri).toBe(
        'projects/host-vpc-project/regions/us-central1/subnetworks/shared-subnet-1'
      );
      expect(execConfig?.serviceAccount).toBe(
        'custom-sa@test-project.iam.gserviceaccount.com'
      );
      expect(execConfig?.kmsKey).toBe(
        'projects/test-project/locations/us-central1/keyRings/my-key-ring/cryptoKeys/my-crypto-key'
      );
    });

    it('should omit serviceAccount when executionIdentity is user_account', () => {
      const result = mapRuntimeProfileToSessionTemplate(
        {
          displayName: 'User Account Profile',
          region: 'us-central1',
          networkAndSecurityConfig: {
            networkSource: 'project',
            primaryNetwork: 'default',
            subnetwork: 'default',
            executionIdentity: 'user_account',
            serviceAccount: 'stale-sa@test-project.iam.gserviceaccount.com',
            encryption: 'google_managed'
          }
        },
        'test-project',
        'us-central1'
      );

      const execConfig = result.environmentConfig?.executionConfig;
      expect(execConfig?.serviceAccount).toBeUndefined();
      expect(execConfig?.authentication_config).toEqual({
        user_workload_authentication_type: 'END_USER_CREDENTIALS'
      });
    });

    it('should throw when customer_managed_key is selected without a resolved KMS key', () => {
      expect(() =>
        mapRuntimeProfileToSessionTemplate(
          {
            displayName: 'Unresolved CMEK Profile',
            region: 'us-central1',
            networkAndSecurityConfig: {
              networkSource: 'project',
              primaryNetwork: 'default',
              subnetwork: 'default',
              encryption: 'customer_managed_key',
              kmsKeySelectionMode: 'select',
              keyRing: 'my-ring',
              cryptoKey: ''
            }
          },
          'test-project',
          'us-central1'
        )
      ).toThrow(
        'Customer-managed encryption key (Cloud KMS key) is required when customer-managed encryption is selected.'
      );
    });

    it('should throw when a project network or shared VPC network is selected without a subnetwork', () => {
      expect(() =>
        mapRuntimeProfileToSessionTemplate(
          {
            displayName: 'Missing Subnetwork Profile',
            region: 'us-central1',
            networkAndSecurityConfig: {
              networkSource: 'project',
              primaryNetwork: 'custom-vpc',
              subnetwork: ''
            }
          },
          'test-project',
          'us-central1'
        )
      ).toThrow('Subnetwork is required when a project network is selected.');

      expect(() =>
        mapRuntimeProfileToSessionTemplate(
          {
            displayName: 'Missing Shared Subnetwork Profile',
            region: 'us-central1',
            networkAndSecurityConfig: {
              networkSource: 'shared_from_host',
              sharedSubnetwork: ''
            }
          },
          'test-project',
          'us-central1'
        )
      ).toThrow(
        'Shared subnetwork is required when shared VPC network is selected.'
      );
    });
    it('maps the session lifecycle times and the staging bucket to the execution config', () => {
      const result = mapRuntimeProfileToSessionTemplate(
        {
          displayName: 'Lifecycle Profile',
          region: 'us-central1',
          runtimeEnvironmentConfig: {
            stagingBucket: 'gs://my-staging-bucket/'
          },
          sessionLifecycleConfig: {
            maxIdleTime: '30 minutes',
            maxIdleTimeQuantity: 30,
            maxIdleTimeUnit: 'minutes',
            maxSessionTime: '2 days'
          }
        },
        'test-project',
        'us-central1'
      );
      expect(result.environmentConfig).toEqual({
        executionConfig: {
          stagingBucket: 'my-staging-bucket',
          idleTtl: '1800s',
          ttl: '172800s'
        }
      });

      // The defaults ('None' and Auto) send nothing
      expect(
        mapRuntimeProfileToSessionTemplate(
          {
            displayName: 'Default Profile',
            region: 'us-central1',
            runtimeEnvironmentConfig: { stagingBucket: 'Auto' },
            sessionLifecycleConfig: {
              maxIdleTime: 'None',
              maxSessionTime: 'None'
            }
          },
          'test-project',
          'us-central1'
        ).environmentConfig
      ).toBeUndefined();
    });

    it('keeps a Spark property written with a prefix instead of adding a derived duplicate', () => {
      const properties = mapRuntimeProfileToSessionTemplate(
        {
          displayName: 'Prefixed Profile',
          region: 'us-central1',
          executorConfig: { executorType: 'general', machineType: 'highmem-4' },
          autoscalingConfig: { maxExecutors: 10 },
          sparkProperties: {
            'spark:spark.executor.cores': '10',
            'spark:spark.dynamicAllocation.maxExecutors': '30'
          }
        },
        'test-project',
        'us-central1'
      ).runtimeConfig?.properties;

      expect(properties?.['spark:spark.executor.cores']).toBe('10');
      expect(properties).not.toHaveProperty('spark.executor.cores');
      expect(properties?.['spark:spark.dynamicAllocation.maxExecutors']).toBe(
        '30'
      );
      expect(properties).not.toHaveProperty(
        'spark.dynamicAllocation.maxExecutors'
      );
      expect(properties?.['spark.executor.memory']).toBe('32g');
    });
  });

  describe('mapSessionTemplateToFormValues', () => {
    it('maps a Shared VPC subnetwork, a key entered by hand, and the default identity of runtime 3.0', () => {
      expect(
        mapSessionTemplateToFormValues(sharedVpcProfile)
          .initialNetworkAndSecurityConfig
      ).toEqual({
        networkSource: 'shared_from_host',
        hostProjectId: 'host-project',
        sharedSubnetwork: 'shared-subnet',
        // Without an authentication type, runtime 3.0 uses end-user credentials
        executionIdentity: 'user_account',
        encryption: 'customer_managed_key',
        kmsKeySelectionMode: 'manual',
        kmsKeyName:
          'projects/kms-project/locations/global/keyRings/kr/cryptoKeys/k'
      });

      expect(
        mapSessionTemplateToFormValues(savedProfile)
          .initialNetworkAndSecurityConfig
      ).toEqual(
        expect.objectContaining({
          // Runtime 2.2 uses the service account by default
          executionIdentity: 'service_account',
          serviceAccount: 'old-sa@test-project.iam.gserviceaccount.com'
        })
      );
    });

    it('maps every form section from a session template, including prefixed property keys', () => {
      const template: IRuntimeProfileTemplate = {
        name: 'projects/test-project/locations/us-central1/sessionTemplates/sample-profile',
        description: 'test123',
        jupyterSession: { displayName: 'Sample Profile', kernel: 'PYTHON' },
        environmentConfig: {
          executionConfig: {
            subnetworkUri: 'default',
            networkTags: ['tag-a'],
            kmsKey: 'projects/p/locations/l/keyRings/kr/cryptoKeys/k',
            stagingBucket: 'my-staging-bucket',
            idleTtl: '3600s',
            ttl: '259200s',
            authenticationConfig: {
              userWorkloadAuthenticationType: 'END_USER_CREDENTIALS'
            }
          },
          peripheralsConfig: {
            metastoreService: 'projects/p/locations/l/services/my-metastore'
          }
        },
        runtimeConfig: {
          version: '2.2',
          containerImage: 'gcr.io/my-project/spark:latest',
          repositoryConfig: {
            pypiRepositoryConfig: {
              pypiRepository: 'https://pypi.example.com/simple'
            }
          },
          properties: {
            'dataproc:dataproc.tier': 'premium',
            'spark:spark.dataproc.engine': 'lightningEngine',
            'spark:spark.executor.cores': '8',
            'spark:spark.executor.memory': '64g',
            'spark:spark.dataproc.executor.compute.tier': 'premium',
            'spark:spark.driver.cores': '4',
            'spark:spark.driver.memory': '16g',
            'spark:spark.dataproc.driver.disk.tier': 'standard',
            'spark:spark.dataproc.driver.disk.size': '400g',
            'spark:spark.dataproc.executor.disk.tier': 'premium',
            'spark:spark.dataproc.executor.disk.size': '375g',
            'spark:spark.dynamicAllocation.enabled': 'true',
            'spark:spark.dynamicAllocation.initialExecutors': '2',
            'spark:spark.dynamicAllocation.minExecutors': '2',
            'spark:spark.dynamicAllocation.maxExecutors': '20',
            'spark:spark.sql.shuffle.partitions': '200',
            'dataproc.lakehouse.defaultCatalog': 'iceberg_cat',
            'dataproc.lakehouse.catalog.hive_cat':
              'projects/p/locations/l/catalogs/hive_cat'
          }
        },
        labels: { env: 'dev' }
      };

      expect(mapSessionTemplateToFormValues(template)).toEqual({
        initialDisplayName: 'Sample Profile',
        initialRegion: 'us-central1',
        initialDescription: 'test123',
        initialTier: 'Premium',
        initialLightningEngineEnabled: true,
        initialExecutorCategory: 'general',
        initialExecutorType: 'highmem-8',
        initialRuntimeEnvironmentConfig: {
          runtimeProfileId: 'sample-profile',
          runtimeVersion: '2.2',
          customSparkImage: 'gcr.io/my-project/spark:latest',
          stagingBucket: 'my-staging-bucket',
          pythonPackageRepository: 'https://pypi.example.com/simple'
        },
        initialExecutorAndDriverConfig: {
          tier: 'Premium',
          driverMachineType: 'standard-4',
          driverDisk: 'Standard persistent disk, 400 GB',
          executorType: 'highmem-8',
          executorDisk: 'Premium persistent disk, 375 GB'
        },
        initialAutoscalingConfig: {
          autoscalingEnabled: true,
          initialExecutors: 2,
          minExecutors: 2,
          maxExecutors: 20
        },
        initialMetastoreConfig: {
          metastore: 'projects/p/locations/l/services/my-metastore',
          hiveEndpointEnabled: true
        },
        initialNetworkAndSecurityConfig: {
          networkSource: 'project',
          executionIdentity: 'user_account',
          networkInThisProject: 'default',
          subnetwork: 'default',
          networkTags: ['tag-a'],
          encryption: 'customer_managed_key',
          kmsKeySelectionMode: 'manual',
          kmsKeyName: 'projects/p/locations/l/keyRings/kr/cryptoKeys/k'
        },
        initialSessionLifecycleConfig: {
          maxIdleTime: '1 hour',
          maxIdleTimeQuantity: 1,
          maxIdleTimeUnit: 'hours',
          maxSessionTime: '3 days',
          maxSessionTimeQuantity: 3,
          maxSessionTimeUnit: 'days'
        },
        // Only properties without a dedicated form control remain here
        initialSparkProperties: {
          'spark:spark.sql.shuffle.partitions': '200',
          'dataproc.lakehouse.defaultCatalog': 'iceberg_cat',
          'dataproc.lakehouse.catalog.hive_cat':
            'projects/p/locations/l/catalogs/hive_cat'
        },
        initialLabels: { env: 'dev' }
      });
    });

    it('keeps values that form controls cannot represent in spark properties and leaves absent values unset', () => {
      const values = mapSessionTemplateToFormValues({
        name: 'projects/p/locations/us-east1/sessionTemplates/legacy-profile',
        jupyterSession: { kernel: 'PYTHON' },
        runtimeConfig: {
          properties: {
            'spark.executor.cores': '6',
            'spark:spark.executor.memory': '20g',
            'spark.dataproc.driver.disk.tier': 'standard',
            'spark.dataproc.driver.disk.size': '1t',
            'spark.dynamicAllocation.maxExecutors': 'unlimited',
            [DATAPROC_LIGHTNING_ENGINE_PROPERTY]: 'default'
          }
        }
      });

      expect(values.initialDisplayName).toBe('legacy-profile');
      expect(values.initialDescription).toBe('');
      // No tier property: Dataproc's default (standard) tier
      expect(values.initialTier).toBe('Standard');
      expect(values.initialLightningEngineEnabled).toBe(false);
      expect(values.initialExecutorCategory).toBe('general');
      expect(values.initialExecutorType).toBeUndefined();
      expect(values.initialRuntimeEnvironmentConfig?.runtimeVersion).toBe(
        undefined
      );
      expect(values.initialExecutorAndDriverConfig).toEqual({
        tier: 'Standard'
      });
      expect(values.initialAutoscalingConfig).toEqual({});
      expect(values.initialSessionLifecycleConfig).toEqual({});
      expect(values.initialNetworkAndSecurityConfig).toEqual({
        networkSource: 'project',
        executionIdentity: 'service_account',
        encryption: 'google_managed'
      });
      expect(values.initialMetastoreConfig).toEqual({
        hiveEndpointEnabled: false
      });
      // Unrepresentable derived values keep their (unprefixed) keys so they
      // are saved unchanged; the Lightning Engine key is owned by its checkbox.
      expect(values.initialSparkProperties).toEqual({
        'spark.executor.cores': '6',
        'spark.executor.memory': '20g',
        'spark.dataproc.driver.disk.tier': 'standard',
        'spark.dataproc.driver.disk.size': '1t',
        'spark.dynamicAllocation.maxExecutors': 'unlimited'
      });
      expect(values.initialLabels).toEqual({});
    });

    it('maps accelerated executors, service account identity, and Lightning Engine without a tier', () => {
      const values = mapSessionTemplateToFormValues({
        name: 'projects/p/locations/us-central1/sessionTemplates/gpu-profile',
        environmentConfig: {
          executionConfig: {
            networkUri: 'my-network',
            idleTtl: '90s',
            authenticationConfig: {
              userWorkloadAuthenticationType: 'SERVICE_ACCOUNT'
            }
          }
        },
        runtimeConfig: {
          properties: {
            [DATAPROC_LIGHTNING_ENGINE_PROPERTY]: 'lightningEngine',
            'spark.executor.cores': '8',
            'spark.executor.memory': '26768m',
            'spark.dataproc.executor.resource.accelerator.type': 'l4'
          }
        }
      });

      expect(values.initialTier).toBe('Premium');
      expect(values.initialLightningEngineEnabled).toBe(true);
      expect(values.initialExecutorCategory).toBe('accelerated');
      expect(values.initialExecutorType).toBe('l4-8');
      expect(values.initialSparkProperties).toEqual({});
      expect(values.initialNetworkAndSecurityConfig).toEqual({
        networkSource: 'project',
        executionIdentity: 'service_account',
        networkInThisProject: 'my-network',
        primaryNetwork: 'my-network',
        encryption: 'google_managed'
      });
      expect(values.initialSessionLifecycleConfig).toEqual({
        maxIdleTime: '90 seconds',
        maxIdleTimeQuantity: 90,
        maxIdleTimeUnit: 'seconds'
      });
    });

    it('detects the Hive endpoint only for catalogs other than the default one', () => {
      const hiveEnabledFor = (metastoreConfig: IMetastoreConfig) =>
        mapSessionTemplateToFormValues(
          mapRuntimeProfileToSessionTemplate(
            {
              displayName: 'lakehouse-profile',
              region: 'us-central1',
              metastoreConfig
            },
            'test-project',
            'us-central1'
          )
        ).initialMetastoreConfig?.hiveEndpointEnabled;

      // An existing default catalog is stored by resource, a new one by name
      expect(
        hiveEnabledFor({
          metastoreType: 'lakehouse',
          catalogSelectionMode: 'existing',
          catalogId: 'my_catalog',
          projectId: 'custom-project'
        })
      ).toBe(false);
      expect(
        hiveEnabledFor({
          metastoreType: 'lakehouse',
          catalogSelectionMode: 'new',
          catalogName: 'sales_catalog'
        })
      ).toBe(false);
      expect(
        hiveEnabledFor({
          metastoreType: 'lakehouse',
          catalogSelectionMode: 'existing',
          catalogId: 'my_catalog',
          hiveEndpointEnabled: true,
          hiveCatalogName: 'shared_hive'
        })
      ).toBe(true);
    });

    it('round-trips a profile created by the form back to the same session template', () => {
      const created = mapRuntimeProfileToSessionTemplate(
        {
          displayName: 'round-trip',
          region: 'us-central1',
          tier: 'Premium',
          lightningEngineEnabled: true,
          executorConfig: { executorType: 'general', machineType: 'highmem-4' },
          runtimeEnvironmentConfig: {
            runtimeProfileId: 'round-trip',
            runtimeVersion: '2.3 LTS (Spark 3.5.1, Python 3.12)'
          },
          executorAndDriverConfig: {
            tier: 'Premium',
            driverMachineType: 'standard-4',
            driverDisk: 'Standard persistent disk, 400 GB',
            executorType: 'highmem-4',
            executorDisk: 'Standard persistent disk, 200 GB'
          },
          autoscalingConfig: {
            autoscalingEnabled: true,
            initialExecutors: 2,
            minExecutors: 2,
            maxExecutors: 10
          },
          sparkProperties: { 'spark.sql.shuffle.partitions': '200' },
          labels: { env: 'dev' }
        },
        'test-project',
        'us-central1'
      );

      const values = mapSessionTemplateToFormValues(created);
      // Rebuild the payload the same way the form does on submit
      const payload: ICreateRuntimeProfilePayload = {
        displayName: values.initialDisplayName ?? '',
        region: values.initialRegion ?? '',
        description: values.initialDescription || undefined,
        tier: values.initialTier,
        lightningEngineEnabled:
          values.initialTier === 'Premium' &&
          Boolean(values.initialLightningEngineEnabled),
        executorConfig: {
          executorType: values.initialExecutorCategory,
          machineType: values.initialExecutorType
        },
        runtimeEnvironmentConfig: values.initialRuntimeEnvironmentConfig,
        executorAndDriverConfig: values.initialExecutorAndDriverConfig,
        autoscalingConfig: values.initialAutoscalingConfig,
        sparkProperties: values.initialSparkProperties,
        labels: values.initialLabels
      };

      expect(
        mapRuntimeProfileToSessionTemplate(
          payload,
          'test-project',
          'us-central1'
        )
      ).toEqual(created);
    });
  });

  describe('mapRuntimeProfileToSessionTemplateUpdate', () => {
    /** The form values the edit form starts from, built like the form does. */
    const formPayloadFor = (
      template: IRuntimeProfileTemplate
    ): ICreateRuntimeProfilePayload => {
      const values = mapSessionTemplateToFormValues(template);
      const tier = values.initialTier ?? 'Premium';
      const isLightningEngineActive =
        tier === 'Premium' && Boolean(values.initialLightningEngineEnabled);
      const executorCategory = values.initialExecutorCategory ?? 'general';
      const executorType =
        values.initialExecutorType ??
        (executorCategory === 'accelerated'
          ? DEFAULT_ACCELERATED_EXECUTOR_TYPE
          : tier === 'Standard'
          ? DEFAULT_STANDARD_TIER_EXECUTOR_TYPE
          : DEFAULT_GENERAL_EXECUTOR_TYPE);
      return {
        displayName: values.initialDisplayName ?? '',
        region: values.initialRegion ?? '',
        description: values.initialDescription || undefined,
        tier,
        lightningEngineEnabled: isLightningEngineActive,
        executorConfig: {
          executorType: executorCategory,
          machineType: executorType
        },
        runtimeEnvironmentConfig: {
          ...values.initialRuntimeEnvironmentConfig,
          lightningEngineEnabled: isLightningEngineActive
        },
        executorAndDriverConfig: {
          ...values.initialExecutorAndDriverConfig,
          tier,
          executorType,
          executorMachineType: executorType,
          lightningEngineEnabled: Boolean(values.initialLightningEngineEnabled)
        },
        autoscalingConfig: values.initialAutoscalingConfig,
        metastoreConfig: values.initialMetastoreConfig,
        networkAndSecurityConfig: values.initialNetworkAndSecurityConfig,
        sessionLifecycleConfig: values.initialSessionLifecycleConfig,
        sparkProperties: values.initialSparkProperties,
        labels: values.initialLabels
      };
    };

    /**
     * Opens the form on `opened`, applies `edit` and builds the update body
     * against `latest`, the copy saved when the user clicks Save.
     */
    const saveEdits = (
      opened: IRuntimeProfileTemplate,
      edit: (payload: ICreateRuntimeProfilePayload) => void = () => undefined,
      latest: IRuntimeProfileTemplate = opened
    ) => {
      const initialPayload = formPayloadFor(opened);
      const payload: ICreateRuntimeProfilePayload = JSON.parse(
        JSON.stringify(initialPayload)
      );
      edit(payload);
      return mapRuntimeProfileToSessionTemplateUpdate(
        payload,
        initialPayload,
        latest
      );
    };

    const withoutOutputOnlyFields = (template: IRuntimeProfileTemplate) => {
      const copy: Record<string, unknown> = { ...template };
      ['createTime', 'updateTime', 'creator', 'uuid'].forEach(
        field => delete copy[field]
      );
      return copy;
    };

    it.each([
      ['a profile created by the form', savedProfile],
      ['a profile created in the Console', consoleProfile],
      ['values the form cannot show', unusualProfile],
      [
        'a Shared VPC subnetwork and a key from another project',
        sharedVpcProfile
      ]
    ])('saves %s unchanged when nothing was edited', (_label, template) => {
      expect(saveEdits(template)).toEqual(withoutOutputOnlyFields(template));
    });

    it('applies the edits made in every section', () => {
      const body = saveEdits(savedProfile, payload => {
        payload.displayName = 'New name';
        payload.description = undefined;
        payload.labels = { env: 'prod', team: 'data' };
        payload.sparkProperties = {
          'spark.sql.shuffle.partitions': '200',
          'spark.foo': 'bar'
        };
        payload.autoscalingConfig = {
          ...payload.autoscalingConfig,
          maxExecutors: 50
        };
        payload.runtimeEnvironmentConfig = {
          ...payload.runtimeEnvironmentConfig,
          runtimeVersion: '2.3 LTS (Spark 3.5, Java 17, Scala 2.13)',
          customSparkImage: '',
          stagingBucket: 'gs://new-bucket/'
        };
        payload.networkAndSecurityConfig = {
          networkSource: 'project',
          primaryNetwork: 'default',
          networkInThisProject: 'default',
          subnetwork: 'new-subnet',
          networkTags: ['new-tag'],
          executionIdentity: 'user_account',
          encryption: 'google_managed'
        };
        payload.sessionLifecycleConfig = {
          maxIdleTime: '30 minutes',
          maxIdleTimeQuantity: 30,
          maxIdleTimeUnit: 'minutes',
          maxSessionTime: '2 days',
          maxSessionTimeQuantity: 2,
          maxSessionTimeUnit: 'days'
        };
      });

      expect(body).toEqual({
        // The ID and region can't change
        name: savedProfile.name,
        jupyterSession: { displayName: 'New name', kernel: 'SCALA' },
        labels: { env: 'prod', team: 'data' },
        runtimeConfig: {
          version: '2.3',
          autotuningConfig: { scenarios: ['SCALING'] },
          properties: {
            [DATAPROC_TIER_PROPERTY]: 'premium',
            [DATAPROC_LIGHTNING_ENGINE_PROPERTY]: 'lightningEngine',
            'spark.executor.cores': '4',
            'spark.executor.memory': '32g',
            'spark.dataproc.executor.compute.tier': 'premium',
            'spark.dynamicAllocation.enabled': 'true',
            'spark.dynamicAllocation.initialExecutors': '2',
            'spark.dynamicAllocation.minExecutors': '2',
            'spark.dynamicAllocation.maxExecutors': '50',
            'spark.sql.shuffle.partitions': '200',
            'spark.foo': 'bar'
          }
        },
        environmentConfig: {
          executionConfig: {
            subnetworkUri: 'new-subnet',
            networkTags: ['new-tag'],
            authenticationConfig: {
              userWorkloadAuthenticationType: 'END_USER_CREDENTIALS'
            },
            stagingBucket: 'new-bucket',
            idleTtl: '1800s',
            ttl: '172800s'
          },
          // Not editable in this form yet, so kept as saved
          peripheralsConfig: savedProfile.environmentConfig?.peripheralsConfig
        }
      });
    });

    it('rewrites a custom executor shape, with its compute tier, when another type is picked', () => {
      const customShapeProfile: IRuntimeProfileTemplate = {
        name: 'projects/test-project/locations/us-central1/sessionTemplates/custom',
        jupyterSession: { displayName: 'Custom', kernel: 'PYTHON' },
        runtimeConfig: {
          properties: {
            [DATAPROC_TIER_PROPERTY]: 'premium',
            'spark.executor.cores': '6',
            'spark.executor.memory': '20g',
            'spark.dataproc.driver.disk.size': '1t'
          }
        }
      };

      const body = saveEdits(customShapeProfile, payload => {
        payload.executorConfig = {
          executorType: 'general',
          machineType: 'highmem-8'
        };
        payload.executorAndDriverConfig = {
          ...payload.executorAndDriverConfig,
          executorType: 'highmem-8',
          executorMachineType: 'highmem-8'
        };
      });

      expect(body.runtimeConfig?.properties).toEqual({
        [DATAPROC_TIER_PROPERTY]: 'premium',
        'spark.executor.cores': '8',
        'spark.executor.memory': '64g',
        'spark.dataproc.executor.compute.tier': 'premium',
        // Other controls keep their values, even ones the form can't show
        'spark.dataproc.driver.disk.size': '1t'
      });
    });

    it('applies a value typed in Spark properties for a control the user did not change', () => {
      const body = saveEdits(unusualProfile, payload => {
        payload.sparkProperties = {
          ...payload.sparkProperties,
          'spark.executor.cores': '10'
        };
      });

      const properties = body.runtimeConfig?.properties;
      expect(properties?.['spark.executor.cores']).toBe('10');
      // The prefixed key is replaced, not duplicated
      expect(properties).not.toHaveProperty('spark:spark.executor.cores');
      expect(properties?.['spark:spark.executor.memory']).toBe('20g');
      expect(properties).not.toHaveProperty(
        'spark.dataproc.executor.compute.tier'
      );
    });

    it('rewrites the tier and Lightning Engine properties when they change', () => {
      const body = saveEdits(unusualProfile, payload => {
        payload.tier = 'Premium';
        payload.lightningEngineEnabled = true;
        payload.runtimeEnvironmentConfig = {
          ...payload.runtimeEnvironmentConfig,
          lightningEngineEnabled: true
        };
      });

      const properties = body.runtimeConfig?.properties;
      expect(properties?.[DATAPROC_TIER_PROPERTY]).toBe('premium');
      expect(properties).not.toHaveProperty('dataproc:dataproc.tier');
      expect(properties?.[DATAPROC_LIGHTNING_ENGINE_PROPERTY]).toBe(
        'lightningEngine'
      );
    });

    it('saves network edits with an explicit execution identity and keeps the Shared VPC subnetwork', () => {
      const body = saveEdits(sharedVpcProfile, payload => {
        payload.networkAndSecurityConfig = {
          ...payload.networkAndSecurityConfig,
          executionIdentity: 'service_account',
          serviceAccount: 'runner@test-project.iam.gserviceaccount.com'
        };
      });

      expect(body.environmentConfig?.executionConfig).toEqual({
        subnetworkUri:
          'projects/host-project/regions/us-central1/subnetworks/shared-subnet',
        kmsKey:
          'projects/kms-project/locations/global/keyRings/kr/cryptoKeys/k',
        serviceAccount: 'runner@test-project.iam.gserviceaccount.com',
        authenticationConfig: {
          userWorkloadAuthenticationType: 'SERVICE_ACCOUNT'
        }
      });
    });

    it('rewrites only the network and security setting the user changed', () => {
      const body = saveEdits(savedProfile, payload => {
        payload.networkAndSecurityConfig = {
          ...payload.networkAndSecurityConfig,
          encryption: 'google_managed',
          kmsKeySelectionMode: undefined,
          kmsKeyName: undefined
        };
      });

      // Only the key is removed. savedProfile has no authenticationConfig, and
      // Execution identity wasn't edited, so none is added.
      expect(body.environmentConfig?.executionConfig).toEqual({
        subnetworkUri: 'default',
        networkTags: ['old-tag'],
        serviceAccount: 'old-sa@test-project.iam.gserviceaccount.com',
        stagingBucket: 'old-bucket',
        idleTtl: '3600s',
        ttl: '259200s'
      });
    });

    it('keeps a network without a subnetwork when other settings change, but rejects a network edit without one', () => {
      // A network without a subnetwork can't be entered in the form
      const described = saveEdits(unusualProfile, payload => {
        payload.description = 'Notes';
      });
      expect(described.description).toBe('Notes');
      expect(described.environmentConfig).toEqual({
        executionConfig: { networkUri: 'custom-vpc' }
      });

      // Tags, encryption and identity are saved without touching the network
      const kmsKey =
        'projects/test-project/locations/us-central1/keyRings/kr/cryptoKeys/k';
      const edited = saveEdits(unusualProfile, payload => {
        payload.networkAndSecurityConfig = {
          ...payload.networkAndSecurityConfig,
          networkTags: ['new-tag'],
          encryption: 'customer_managed_key',
          kmsKeySelectionMode: 'manual',
          kmsKeyName: kmsKey,
          executionIdentity: 'user_account'
        };
      });
      expect(edited.environmentConfig).toEqual({
        executionConfig: {
          networkUri: 'custom-vpc',
          networkTags: ['new-tag'],
          kmsKey,
          authenticationConfig: {
            userWorkloadAuthenticationType: 'END_USER_CREDENTIALS'
          }
        }
      });

      expect(() =>
        saveEdits(unusualProfile, payload => {
          payload.networkAndSecurityConfig = {
            ...payload.networkAndSecurityConfig,
            primaryNetwork: 'other-vpc',
            networkInThisProject: 'other-vpc'
          };
        })
      ).toThrow('Subnetwork is required when a project network is selected.');
    });

    it('clears the staging bucket when it is set back to Auto', () => {
      const body = saveEdits(savedProfile, payload => {
        payload.runtimeEnvironmentConfig = {
          ...payload.runtimeEnvironmentConfig,
          stagingBucket: 'Auto'
        };
      });
      expect(body.environmentConfig?.executionConfig).not.toHaveProperty(
        'stagingBucket'
      );
      expect(body.environmentConfig?.executionConfig?.subnetworkUri).toBe(
        'default'
      );
    });

    it('keeps sparkConnectSession and never adds jupyterSession for a Spark Connect template', () => {
      // session_config is a oneof: writing jupyterSession would turn the
      // template into a Jupyter one (or be rejected if both were sent).
      const sparkConnectProfile: IRuntimeProfileTemplate = {
        name: 'projects/test-project/locations/us-central1/sessionTemplates/spark_connect',
        sparkConnectSession: {},
        runtimeConfig: { version: '2.2' }
      };
      const onlySessionKeys = (body: object) =>
        Object.keys(body).filter(key =>
          ['jupyterSession', 'sparkConnectSession'].includes(key)
        );

      const described = saveEdits(sparkConnectProfile, payload => {
        payload.description = 'new description';
      });
      expect(described.description).toBe('new description');
      expect(described.sparkConnectSession).toEqual({});
      expect(onlySessionKeys(described)).toEqual(['sparkConnectSession']);

      // A Spark Connect template has no display name, so renaming is a no-op
      const renamed = saveEdits(sparkConnectProfile, payload => {
        payload.displayName = 'Renamed';
      });
      expect(renamed.sparkConnectSession).toEqual({});
      expect(renamed).not.toHaveProperty('jupyterSession');
      expect(onlySessionKeys(renamed)).toEqual(['sparkConnectSession']);
    });
  });
});
