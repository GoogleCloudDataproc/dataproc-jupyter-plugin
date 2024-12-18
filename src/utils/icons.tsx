import { LabIcon } from '@jupyterlab/ui-components';
import errorIcon from '../../style/icons/error_icon.svg';
import deleteIcon from '../../style/icons/scheduler_delete.svg';
import CompletedIcon from '../../style/icons/dag_task_success_icon.svg';
import FailedIcon from '../../style/icons/list_error_icon.svg';
import ActiveIcon from '../../style/icons/list_active_icon.svg';
import ListPauseIcon from '../../style/icons/list_pause_icon.svg';
import ListCompleteIcon from '../../style/icons/list_completed_with_error.svg'
import playIcon from '../../style/icons/scheduler_play.svg';
import pauseIcon from '../../style/icons/scheduler_pause.svg';
import EditIconDisable from '../../style/icons/scheduler_edit_dag.svg';
import EditNotebookIcon from '../../style/icons/scheduler_edit_calendar.svg';
import triggerIcon from '../../style/icons/scheduler_trigger.svg';
import LeftArrowIcon from '../../style/icons/left_arrow_icon.svg';
import downloadIcon from '../../style/icons/scheduler_download.svg';
import expandLessIcon from '../../style/icons/expand_less.svg';
import expandMoreIcon from '../../style/icons/expand_more.svg';

export const IconError = new LabIcon({
    name: 'launcher:error-icon',
    svgstr: errorIcon
});

export const IconDelete = new LabIcon({
    name: 'launcher:delete-icon',
    svgstr: deleteIcon
});

export const IconPlay = new LabIcon({
    name: 'launcher:play-icon',
    svgstr: playIcon
});

export const IconPause = new LabIcon({
    name: 'launcher:pause-icon',
    svgstr: pauseIcon
});

export const IconEditDag = new LabIcon({
    name: 'launcher:edit-disable-icon',
    svgstr: EditIconDisable
});

export const IconEditNotebook = new LabIcon({
    name: 'launcher:edit-notebook-icon',
    svgstr: EditNotebookIcon
});

export const IconTrigger = new LabIcon({
    name: 'launcher:trigger-icon',
    svgstr: triggerIcon
});

export const IconSuccess = new LabIcon({
    name: 'launcher:success-icon',
    svgstr: CompletedIcon
});

export const IconFailed = new LabIcon({
    name: 'launcher:failed-icon',
    svgstr: FailedIcon
});

export const IconActive = new LabIcon({
    name: 'launcher:active-icon',
    svgstr: ActiveIcon
});

export const IconListPause = new LabIcon({
    name: 'launcher:list-pause-icon',
    svgstr: ListPauseIcon
});

export const IconListComplete = new LabIcon({
    name: 'launcher:list-complete-icon',
    svgstr: ListCompleteIcon
});

export const IconLeftArrow = new LabIcon({
    name: 'launcher:left-arrow-icon',
    svgstr: LeftArrowIcon
});

export const IconDownload = new LabIcon({
    name: 'launcher:download-icon',
    svgstr: downloadIcon
});

export const IconExpandLess = new LabIcon({
    name: 'launcher:expand-less-icon',
    svgstr: expandLessIcon
});

export const IconExpandMore = new LabIcon({
    name: 'launcher:expand-more-icon',
    svgstr: expandMoreIcon
});
