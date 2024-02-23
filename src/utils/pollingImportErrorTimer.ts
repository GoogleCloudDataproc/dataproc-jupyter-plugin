import { POLLING_IMPORT_ERROR} from './const';

const PollingImportErrorTimer = (
  pollingFunction: () => void,
  pollingDisable: boolean,
  interval: NodeJS.Timeout | undefined
) => {
  if (pollingDisable) {
    clearInterval(interval);
  } else {
    interval = setInterval(pollingFunction, POLLING_IMPORT_ERROR);
    return interval;
  }
};

export default PollingImportErrorTimer ;
