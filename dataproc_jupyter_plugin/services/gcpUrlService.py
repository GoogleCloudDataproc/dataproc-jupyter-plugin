from google.cloud.jupyter_config.config import get_gcloud_config

# from dataproc_jupyter_plugin import handlers

def gcp_service_url(service_name, default_url=None):
    default_url = default_url or f'https://{service_name}.googleapis.com/'
    configured_url = get_gcloud_config(f'configuration.properties.api_endpoint_overrides.{service_name}')
    url = configured_url or default_url
    # handlers.LogHandler.info('Service_url for service {service_name}: {url}')
    return url