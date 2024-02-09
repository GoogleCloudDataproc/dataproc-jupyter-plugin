import { requestAPI } from '../handler/handler';

/**
 * Enum of python log levels.
 */
export enum LOG_LEVEL {
  NOTSET = 0,
  DEBUG = 10,
  INFO = 20,
  WARN = 30,
  ERROR = 40,
  CRITICAL = 50
}

export class DataprocLoggingService {
  /**
   * Helper method to attach a log listener to the toplevel handler.
   */
  static attach() {
    window.addEventListener('error', (e: ErrorEvent | any) => {
      try {
        if (e instanceof ErrorEvent) {
          const { message, filename, lineno, colno, error } = e;

          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/stack
          const stack = error.stack;
          const formattedMessage = `Error: ${filename}:${lineno}:${colno}\n${stack}\n${message}\n${JSON.stringify(
            error
          )}`;
          DataprocLoggingService.log(formattedMessage, LOG_LEVEL.ERROR);
          return;
        }
        // TODO: Add fallback if e is not an errorevent.
      } catch (e) {
        // Catch everything, because if we throw here
        // we might infinite loop.
      }
    });
  }

  /**
   * Helper method to log fetch request / response to Jupyter Server.
   */
  static async logFetch(
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    response: Response
  ) {
    const method = init?.method ?? 'GET';
    return this.log(
      `${method} ${input.toString()} ${response.status} ${
        response.statusText
      } `,
      LOG_LEVEL.DEBUG
    );
  }

  /**
   * Helper method to log a message to Jupyter Server.
   * @param message Message to be logged
   * @param level Python log level
   * @returns Status message OK or Error.
   */
  static async log(
    message: string,
    level: LOG_LEVEL = LOG_LEVEL.INFO
  ): Promise<string> {
    const resp = await requestAPI('log', {
      body: JSON.stringify({
        message: message,
        level: level
      }),
      method: 'POST'
    });
    return (resp as any)['status'];
  }
}
