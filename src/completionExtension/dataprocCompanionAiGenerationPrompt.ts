import { IKernelConnection } from '@jupyterlab/services/lib/kernel/kernel';

export async function generatePrompt(
  userPrompt: string,
  kernel: IKernelConnection | null | undefined
): Promise<string> {
  const dfResult = Array.from(userPrompt.matchAll(/\$\w+/g)).map(result =>
    result[0].substring(1)
  );
  const sanitizedPrompt = userPrompt.replace(/\$\w+/g, token =>
    token.substring(1)
  );

  if (kernel) {
    const userExpressions = Object.fromEntries(
      dfResult.map(df => [df, `${df}.head(10)`])
    );
    const result = await kernel.requestExecute({
      code: '',
      silent: true,
      user_expressions: userExpressions
    }).done;

    /* @ts-ignore */
    const userExpressionsResults = result.content?.user_expressions;
    if (userExpressionsResults) {
      const schemaDescriptions = Object.keys(userExpressionsResults).map(
        df =>
          `The variable ${df} is a dataframe and the first 10 rows look like: ${userExpressionsResults[df].data['text/plain']}`
      );

      return `${schemaDescriptions.join(
        '\n'
      )}\n. Write Python code that generates ${sanitizedPrompt}`;
    }
  }
  console.error('failed to extract dataframe schema for Duet AI');
  return `Write pyspark code that generates ${sanitizedPrompt}`;
}
