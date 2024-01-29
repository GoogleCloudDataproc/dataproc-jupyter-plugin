from datetime import datetime, timedelta, timezone
import uuid
from airflow import DAG
from airflow.providers.google.cloud.operators.dataproc import DataprocCreateBatchOperator

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
    'email_on_success':'{{email_success}}'
}
input_notebook = '{{input_notebook}}'
output_notebook = '{{output_notebook}}'
parameters = '''
{{parameters}}
'''
notebook_args= [input_notebook, output_notebook] 
if parameters.strip():  # Check if parameters is not empty or contains only whitespace
    notebook_args.extend(["--parameters", parameters])


dag = DAG(
    '{{name}}', 
    default_args=default_args,
    description='{{name}}',
    tags =['dataproc_jupyter_plugin'],
    schedule_interval='{{schedule_interval}}',
)


create_batch = DataprocCreateBatchOperator(
        task_id="batch_create",
        project_id = '{{gcpProjectId}}',
        region = '{{gcpRegion}}',
        batch={
            "pyspark_batch": {
            "main_python_file_uri": '{{inputFilePath}}',
            "args": notebook_args
                
            },
            "environment_config": {
                "peripherals_config": {
                    "spark_history_server_config": {
                        "dataproc_cluster": '{{phs_path}}',
                    },
                },
            },
        },
        batch_id=str(uuid.uuid4()),
        dag = dag,
    )
