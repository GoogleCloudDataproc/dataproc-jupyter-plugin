import json
import subprocess
from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.dagListService import DagListService
# from google.cloud import storage

class DagController(APIHandler):
    def get(self):
        dag = DagListService()
        composer_name = self.get_argument("composer")
        credentials = handlers.get_cached_credentials(self.log)
        dag_list = dag.list_jobs(credentials,composer_name)
        self.finish(json.dumps(dag_list))
    
class Download(APIHandler):
    def get(self):
        print("---------Download---------")
        gcs_path = self.get_argument("dag_path")
        # path = 'gs://us-central1-composer4-fe041c11-bucket/dataproc-notebooks/testschedule1.ipynb'
        cmd = f"gsutil cp 'gs://{gcs_path}' ~/Downloads"
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
        output, _ = process.communicate()
        print(process.returncode,_,output)
        if process.returncode == 0:
            self.finish({'status' : 0})
        else:
            self.finish({'status': 1})
        # bucket_name = 'us-central1-composer4-fe041c11-bucket'
        # source_blob_name = 'dataproc-notebooks/testschedule1.ipynb'
        # destination_file_name = '~Downloads'
        # storage_client = storage.Client()

        # bucket = storage_client.bucket(bucket_name)
        # blob = bucket.blob(source_blob_name)

        # blob.download_to_filename(destination_file_name)


        