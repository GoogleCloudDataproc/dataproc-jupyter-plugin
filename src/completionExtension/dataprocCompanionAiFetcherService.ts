import { API_HEADER_BEARER, API_HEADER_CONTENT_TYPE } from '../utils/const';
import { authApi } from '../utils/utils';

interface GenerateCodeResponse {
  predictions: Array<{
    content: string;
    score: number;
  }>;
}

type Options = {
  prefix: string;
  postfix?: string;
  model?: string;
  maxOutputTokens?: number;
  stopSequences?: string[];
};
export class DataprocCompanionAiFetcherService {
  static async fetch(options: Options) {
    const { prefix, postfix, model, maxOutputTokens, stopSequences } = {
      postfix: '',
      model: 'code-bison',
      maxOutputTokens: 256,
      ...options
    };
    const credentials = await authApi();
    if (!credentials) return;

    const response = await fetch(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${credentials.project_id}/locations/${credentials.region_id}/publishers/google/models/${model}:predict`,
      {
        method: 'POST',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        },
        body: JSON.stringify({
          instances: {
            prefix,
            postfix
          },
          parameters: {
            temperature: 0.3,
            maxOutputTokens,
            candidateCount: 1,
            stopSequences
          }
        })
      }
    );

    const responseJson = (await response.json()) as GenerateCodeResponse;
    return responseJson.predictions;
  }
}
