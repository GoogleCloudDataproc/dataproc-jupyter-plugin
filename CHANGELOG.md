# Changelog

<!-- <START NEW CHANGELOG ENTRY> -->
## 0.1.94
* Bug fix/create runtime template widget getting blank on jupyter 3.x by @srinivasan-acn in #341
* Fix: datatype fix due to conflicting versions by @aditee-accenture in #340
* Remove the project_number field from the credentials handler response by @ojarjur in #339
<!-- <END NEW CHANGELOG ENTRY> -->

<!-- <START NEW CHANGELOG ENTRY> -->
## 0.1.94
* fix: Fix bigQuery enable Api hyperlink by @aditee-accenture in #314
* Filter jupyter templates as part of runtime templates listing by @aditee-accenture in #320
* Batches-network-loader-fix by @aditee-accenture in #312
* BigQuery API not enabled - Customer Issue fixed. by @srinivasan-acn in #315
* Staged Bucket and Metastore Service Listing changes by @srinivasan-acn in #316
* Staging Bucket and Metastore Changes by @srinivasan-acn in #323
* Runtime Template - staging bucket error css fix by @aditee-accenture in #325
<!-- <END NEW CHANGELOG ENTRY> -->

<!-- <START NEW CHANGELOG ENTRY> -->
## 0.1.93
* Lightning Engine Changes for Batches by @srinivasan-acn in #307
* Sparkmonitor Build Integration by @rao23 in #309
* Lightning Engine Changes for Sessions and Runtime Templates. by @srinivasan-acn in #308
<!-- <END NEW CHANGELOG ENTRY> -->

<!-- <START NEW CHANGELOG ENTRY> -->
## 0.1.92
* Metastore catalog name change by @aditee-accenture in #303
* Kernel starting status visibility by @aditee-accenture in #306
<!-- <END NEW CHANGELOG ENTRY> -->

<!-- <START NEW CHANGELOG ENTRY> -->
## 0.1.91
* Prompt-change-for-new-plugin-version by @aditee-accenture in #282
* Batches-subnetwork-gpa-error-fix by @aditee-accenture in #283
* Dynamic Changes in Spark Properties Inputs by @srinivasan-acn in #291
* DataCatalog API to Dataplex API conversion by @srinivasan-acn in #290
* Feature- Add Biglake metastore to Runtime templates by @srinivasan-acn in #293
* Dataset explorer Optimization Changes / Test Case Added by @srinivasan-acn in #294
* Bug Fix as part of Bug Bash for 0.1.91 release by @srinivasan-acn in #295
* Bug Fix as part of Bug Bash for 0.1.91 release by @srinivasan-acn in #296
* Error handling Fix - 0.1.91 Release by @srinivasan-acn in #297
* BigQuery Dataset explorer expands flaky issue fix by @amatheen in #298
<!-- <END NEW CHANGELOG ENTRY> -->

<!-- <START NEW CHANGELOG ENTRY> -->
## 0.1.90
* login module code changes by @aditee-accenture in #274
* Login module changes new by @aditee-accenture in #276
* checking and providing notification to user if dataproc, bigquery API not enabled by @saranyaloganathan23 in #267
* bigquery-panel-error-fix by @aditee-accenture in #279
* fix-subnetwork-error by @aditee-accenture in #280
* Regenerate third-party-licenses.txt by @bansalaayushi23 in #285
* Add kernel_gateway_project_number config by @ptch314 in #287
* Scheduler-dependency-change by @aditee-accenture in #281
* Disabling Project ID Dropdown by @srinivasan-acn in #288
<!-- <END NEW CHANGELOG ENTRY> -->

<!-- <START NEW CHANGELOG ENTRY> -->
## 0.1.89
* remove seemingly unnecessary step in create_and_run_notebook and notebook_scheduler ui test by @ptch314 in #255
* Address slowness in loading jupyterlab when plugin is installed by @saranyaloganathan23 in #260
* Change all toasts messages to the Jupyter notification by @saranyaloganathan23 in #261
* Dataproc serverless notebook section name change by @saranyaloganathan23 in #258
* Css fixes and settings name changes by @saranyaloganathan23 in #265
* runtime template staging bucket by @aditee-accenture in #266
* Batches-toast-message-fix by @aditee-accenture in #269
* Bug Fix: Implemented the server side pagination for listing the batches. by @shreyas-ls in #259
* Bug fix: Spark property spark.task.resource.gpu.amount is setting to default by @shreyas-ls in #257
* fix: filter dataproc:internal property from batches by @aditee-accenture in #271
* batch-error-msg-change by @aditee-accenture in #270
<!-- <END NEW CHANGELOG ENTRY> -->

<!-- <START NEW CHANGELOG ENTRY> -->
## 0.1.88
* Defaulting execution config to service account. by @shreyas-ls in #253
<!-- <END NEW CHANGELOG ENTRY> -->

<!-- <START NEW CHANGELOG ENTRY> -->
## 0.1.87
* Modified Runtime Version field from textbox to dropdown for Runtime Templates and Batches by @aditee-accenture in #242
* Added Runtime version 2.3 to dropdown for Batches and RT by @aditee-accenture in #246
* Check Plugin version and inform the user about the availability of the new version. by @shreyas-ls in #243
* Modified Runtime Templates user account as default option and implemented EUC for batches by @aditee-accenture in #244
* Updated the options for the bigquery dataset table. by @shreyas-ls in #245
* Updated the kernel status position in the tool bar by @shreyas-ls in #248
* Fixed the alignment of the bigquery table attributes. by @shreyas-ls in #249
* Version bump v0.1.87 by @ptch314 in #250
* Updated bigQueryWidget.tsx by @Shubha-accenture in #251
* Update bigQueryWidget.tsx to remove Preview label for Dataset Explorer by @Shubha-accenture in #252
<!-- <END NEW CHANGELOG ENTRY> -->

<!-- <START NEW CHANGELOG ENTRY> -->
## 0.1.86
* Increase gateway retry interval, retry max, and request timeouts by @jinnthehuman in #233, #237, #238
* Modifications to Runtime template UI by @aditee-accenture in #239
* Modifications to Runtime template list UI by @aditee-accenture in #240
<!-- <END NEW CHANGELOG ENTRY> -->

<!-- <START NEW CHANGELOG ENTRY> -->
## 0.1.85
* Personal Authentication Implementation in runtime templates by @saranyaloganathan23 in https://github.com/GoogleCloudDataproc/dataproc-jupyter-plugin/pull/226
* Bigquery API check by @aditee-accenture in https://github.com/GoogleCloudDataproc/dataproc-jupyter-plugin/pull/224
* Check resource manager api by @saranyaloganathan23 in https://github.com/GoogleCloudDataproc/dataproc-jupyter-plugin/pull/225
<!-- <END NEW CHANGELOG ENTRY> -->

<!-- <START NEW CHANGELOG ENTRY> -->
## 0.1.84
* Create separate flags for enabling/disabling each preview feature in isolation. by @saranyaloganathan23 in https://github.com/GoogleCloudDataproc/dataproc-jupyter-plugin/pull/196
* Session details scroll fix by @Gangulareddy120 in https://github.com/GoogleCloudDataproc/dataproc-jupyter-plugin/pull/215
* Bugfix: Included network name in the toast when subnets are not available by @aditee-accenture in https://github.com/GoogleCloudDataproc/dataproc-jupyter-plugin/pull/217
* Notebook Templates - change bigframes quickstart url by @NiloFreitas in https://github.com/GoogleCloudDataproc/dataproc-jupyter-plugin/pull/219
* Removing bigframe dependency by @saranyaloganathan23 in https://github.com/GoogleCloudDataproc/dataproc-jupyter-plugin/pull/220
* Project region validation for user inputs in jupyter lab by @saranyaloganathan23 in https://github.com/GoogleCloudDataproc/dataproc-jupyter-plugin/pull/216
* Modified code to Check if Composer API  is enabled while creating/listing schedule by @aditee-accenture in https://github.com/GoogleCloudDataproc/dataproc-jupyter-plugin/pull/218
<!-- <END NEW CHANGELOG ENTRY> -->
