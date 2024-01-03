
from dataproc_jupyter_plugin.services.gcpUrlService import gcp_service_url

ENVIRONMENT_API = 'https://composer.googleapis.com/v1'


dataproc_url = gcp_service_url('dataproc')
dataproc_url = gcp_service_url('dataproc')
compute_url = gcp_service_url('compute', default_url='https://compute.googleapis.com/compute/v1')
metastore_url = gcp_service_url('metastore')
cloudkms_url = gcp_service_url('cloudkms')
cloudresourcemanager_url = gcp_service_url('cloudresourcemanager')
datacatalog_url = gcp_service_url('datacatalog')
storage_url =  gcp_service_url('storage', default_url='https://storage.googleapis.com/storage/v1/')