import { IKernelConnection } from '@jupyterlab/services/lib/kernel/kernel';

export async function generatePromptWithKernel(
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
      )}\n. Generate python .ipynb code that generates ${sanitizedPrompt}.  `;
    }
  }
  console.error('failed to extract dataframe schema for Duet AI');
  return `Generate python .ipynb code that generates ${sanitizedPrompt}.  `;
}

export async function generatePrompt(
  filePath: string,
  prevCellContext: string[],
  prompt: string
): Promise<string> {
  return `Write python code to generate ${prompt}.  This code will be added to ${filePath}.  The previous cell's code and output is provided in markup below: \n ${prevCellContext.join(
    '\n\n'
  )}`;
}
