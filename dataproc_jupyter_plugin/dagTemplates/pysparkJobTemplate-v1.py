from datetime import datetime, timedelta, timezone
from airflow import DAG
from airflow.providers.google.cloud.operators.dataproc import DataprocSubmitJobOperator
from airflow.operators.python_operator import PythonOperator
from google.cloud import dataproc_v1
from google.api_core.client_options import ClientOptions
import pendulum

yesterday = datetime.combine(
    datetime.today() - timedelta(1),
    datetime.min.time())
default_args = {
    'owner': '{{owner}}',
    'start_date': '{{start_date}}',
    'retries': '{{retry_count}}',
    'retry_delay': timedelta(minutes=int('{{retry_delay}}')), 
    'email': '{{email}}',  #list of all the ids passed from UI
    'email_on_failure': '{{email_failure}}',     # based on the value passed fro UI
    'email_on_retry': '{{email_delay}}',      # based on the value passed fro UI
}
input_notebook = '{{input_notebook}}'
output_notebook = '{{output_notebook}}'
notebook_args= [input_notebook, output_notebook] 

def get_client_cert():
    # code to load client certificate and private key.
    return client_cert_bytes, client_private_key_bytes
 

def get_cluster_state_start_if_not_running():

    options = ClientOptions(api_endpoint="{{gcpRegion}}-dataproc.googleapis.com:443",
    client_cert_source=get_client_cert)

    # Create a client
    client = dataproc_v1.ClusterControllerClient(client_options=options)

    # Initialize request argument(s)
    request = dataproc_v1.GetClusterRequest(
        project_id='{{gcpProjectId}}',
        region='{{gcpRegion}}',
        cluster_name='{{cluster_name}}',
    )

    # Make the request
    response = client.get_cluster(request=request)
    
   
    # Handle the response
    print(f"State is {response.status.state}")
    if response.status.state in (6, 7):
       print("Let's start the cluster")

       request1 = dataproc_v1.StartClusterRequest(
        project_id='{{gcpProjectId}}',
        region='{{gcpRegion}}',
        cluster_name='{{cluster_name}}',
    )
       operation = client.start_cluster(request=request1)
       print("Waiting for operation to complete...")
       response = operation.result()

    elif response.status.state in (2, 5):
       print("Cluster is already running")

    else:
        print("Cluster is unavailable")
        raise Exception("API request failed")

 
def stop_cluster():
 
    options = ClientOptions(api_endpoint="{{gcpRegion}}-dataproc.googleapis.com:443",
    client_cert_source=get_client_cert)
 
    # Create a client
    client = dataproc_v1.ClusterControllerClient(client_options=options)
 
    # Initialize request argument(s)
    request = dataproc_v1.StopClusterRequest(
        project_id='{{gcpProjectId}}',
        region='{{gcpRegion}}',
        cluster_name='{{cluster_name}}',
    )
 
    # Make the request
    operation = client.stop_cluster(request=request)
    print("Waiting for operation to complete...")
    response = operation.result()
 
    # Handle the response
    print(response)

dag = DAG(
    '{{name}}', 
    default_args=default_args,
    description='{{name}}',
    schedule_interval='{{schedule_interval}}',
)

start_cluster = PythonOperator(
    task_id='start_cluster',
    python_callable=get_cluster_state_start_if_not_running,
    provide_context=True,
    dag=dag)

submit_pyspark_job = DataprocSubmitJobOperator(
    task_id='submit_pyspark_job',
    project_id='{{gcpProjectId}}',  # This parameter can be overridden by the connection
    region='{{gcpRegion}}',  # This parameter can be overridden by the connection 
    job={
        'reference': {'project_id': '{{gcpProjectId}}'},
        'placement': {'cluster_name': '{{cluster_name}}'},
        'labels': {'client': 'dataproc-jupyter-plugin'},
        'pyspark_job': {
            'main_python_file_uri': '{{inputFilePath}}'
        },
    },
    gcp_conn_id='google_cloud_default',  # Reference to the GCP connection
    dag=dag,
)
if '{{stop_cluster}}' == 'True':
    stop_cluster = PythonOperator(
        task_id='stop_cluster',
        python_callable=stop_cluster,
        provide_context=True,
        dag=dag)
    
start_cluster >> submit_pyspark_job >> stop_cluster 