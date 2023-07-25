import React from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import ViewLogsIcon from '../../style/icons/view_logs_icon.svg';
import { VIEW_LOGS_CLUSTER_URL } from './const';

const iconViewLogs = new LabIcon({
  name: 'launcher:view-logs-icon',
  svgstr: ViewLogsIcon
});

function ViewLogs({ clusterInfo, projectName }: any) {
  return (
    <div
      className={
        clusterInfo
          ? 'action-cluster-section'
          : 'action-disabled action-cluster-section'
      }
      onClick={() => {
        window.open(
          `${VIEW_LOGS_CLUSTER_URL}${clusterInfo.clusterName}%22%0Aresource.labels.cluster_uuid%3D%22${clusterInfo.clusterUuid}%22?project=${projectName}`,
          '_blank'
        );
      }}
    >
      <div className="action-cluster-icon">
        <iconViewLogs.react tag="div" />
      </div>
      <div className="action-cluster-text">VIEW LOGS</div>
    </div>
  );
}
export default ViewLogs;
