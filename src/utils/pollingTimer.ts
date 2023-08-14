import { POLLING_TIME_LIMIT } from './const';

const PollingTimer = (
  pollingFunction: () => void,
  pollingDisable: boolean,
  interval: NodeJS.Timeout | undefined
) => {
  if (pollingDisable) {
    clearInterval(interval);
  } else {
    interval = setInterval(pollingFunction, POLLING_TIME_LIMIT);
    return interval;
  }
};

export default PollingTimer;
