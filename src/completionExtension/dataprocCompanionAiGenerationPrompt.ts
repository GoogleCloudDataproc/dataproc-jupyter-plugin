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
export async function generateFixPrompt(
  filePath: string,
  curCellCode: string,
  curCellError: string,
  prevCellContext: string[],
  issue: string | null,
  prompt: string
): Promise<string> {
  const prompts = [];

  if (prompt && prompt.length > 0) {
    prompts.push(
      `I tried to write code to generate ${prompt}.  It doesn\'t work as intended. \n `
    );
  } else {
    prompts.push(
      `I have written some code.  It doesn\'t work as intended. \n `
    );
  }
  if (issue) {
    prompts.push(`The issue I have with the code is: "${issue}". \n`);
  }
  prompts.push(`The current code is currently: \n ${curCellCode}\n`);
  if (curCellError && curCellError.length > 0) {
    prompts.push(`It gives me the error: \n ${curCellError}\n`);
  }
  prompts.push(`This code will be added to ${filePath}`);
  prompts.push(
    `The previous cell's code and output is provided in markup below: \n ${prevCellContext.join(
      '\n\n'
    )}`
  );
  return prompts.join('\n');
}
