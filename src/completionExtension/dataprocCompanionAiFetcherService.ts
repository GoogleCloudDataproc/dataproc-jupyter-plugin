import { API_HEADER_BEARER, API_HEADER_CONTENT_TYPE } from '../utils/const';
import { authApi } from '../utils/utils';

interface GenerateCodeResponse {
  predictions: Array<{
    content: string;
    score: number;
  }>;
}
export class DataprocCompanionAiFetcherService {
  async fetch(prefix: string) {
    const credentials = await authApi();
    if (!credentials) return;

    const response = await fetch(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${credentials.project_id}/locations/${credentials.region_id}/publishers/google/models/code-bison:predict`,
      {
        method: 'POST',
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.access_token
        },
        body: JSON.stringify({
          instances: {
            prefix: prefix
          },
          parameters: {
            temperature: 0.3,
            maxOutputTokens: 256,
            candidateCount: 1
          }
        })
      }
    );

    const responseJson = (await response.json()) as GenerateCodeResponse;
    return responseJson.predictions;
  }
}
