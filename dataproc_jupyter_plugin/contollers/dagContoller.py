import json
import subprocess
from jupyter_server.base.handlers import APIHandler
from dataproc_jupyter_plugin import handlers
from dataproc_jupyter_plugin.services.dagListService import DagListService, DagDeleteService, DagUpdateService
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
        composer = self.get_argument("composer")
        dag_id = self.get_argument("dag_id")
        bucket_name = self.get_argument("bucket_name")
        # path = 'gs://us-central1-composer4-fe041c11-bucket/dataproc-notebooks/testschedule1.ipynb'
        cmd = f"gsutil cp 'gs://{bucket_name}/dataproc-notebooks/{dag_id}/input-notebooks/' ~/Downloads"
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
        output, _ = process.communicate()
        print(process.returncode,_,output)
        if process.returncode == 0:
            self.finish({'status' : 0})
        else:
            self.finish({'status': 1})
            
class Delete(APIHandler):
    def get(self):
        print("---------Delete---------")
        dag = DagDeleteService()
        composer = self.get_argument("composer")
        dag_id = self.get_argument("dag_id")
        credentials = handlers.get_cached_credentials(self.log)
        delete_response = dag.delete_job(credentials,composer, dag_id)
        if delete_response == 0: 
            self.finish({'status' : 0})
        else:
            self.finish(json.dumps(delete_response))

class Update(APIHandler):
    def get(self):
        print("---------update---------")
        dag = DagUpdateService()
        composer = self.get_argument("composer")
        dag_id = self.get_argument("dag_id")
        credentials = handlers.get_cached_credentials(self.log)
        update_response = dag.update_job(credentials,composer, dag_id)
        if update_response == 0: 
            self.finish({'status' : 0})
        else:
            self.finish(json.dumps(update_response))
        



        