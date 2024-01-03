from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.google.cloud.operators.dataproc import DataprocSubmitJobOperator

yesterday = datetime.combine(
    datetime.today() - timedelta(1),
    datetime.min.time())

default_args = {
    'owner': '{{owner}}',
    'start_date': yesterday,
    'retries': '{{retry_count}}',
    'retry_delay': timedelta(minutes=int('{{retry_delay}}')), 
    'email': '{{email}}',  #list of all the ids passed from UI
    'email_on_failure': '{{email_failure}}',     # based on the value passed fro UI
    'email_on_retry': '{{email_delay}}',      # based on the value passed fro UI
}
input_notebook = '{{input_notebook}}'
output_notebook = '{{output_notebook}}'
notebook_args= [input_notebook, output_notebook] 

dag = DAG(
    '{{name}}', 
    default_args=default_args,
    description='{{name}}',
    schedule_interval='{{schedule_interval}}',
)

# if '{{mode_selected}}' == 'serverless':
#     cluster_name = ''
#     serverless_name = '{{serverless_name}}'
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
