import { loggedFetch } from '../utils/utils';
import { NOTEBOOK_TEMPLATES_LIST_URL } from '../utils/const';

interface ITemplateList {
  category: string;
  name: string;
  description: string;
  actions: React.JSX.Element;
}

class NotebookTemplateService {
  static listNotebookTemplateAPIService = async (
    setTemplateList: (value: ITemplateList[]) => void,
    renderActions: (value: ITemplateList) => React.JSX.Element,
    setIsLoading: (value: boolean) => void
  ) => {
    loggedFetch(NOTEBOOK_TEMPLATES_LIST_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github.raw'
      }
    })
      .then((response: Response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch notebook content. Status: ${response.status}`
          );
        }
        return response.json();
      })
      .then((responseData: any) => {
        let transformNotebookData = responseData.map((data: ITemplateList) => {
          return {
            name: data.name,
            category: data.category,
            description: data.description,
            actions: renderActions(data)
          };
        });
        setTemplateList(transformNotebookData);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        console.error('Error fetching data:', err);
        setIsLoading(false);
      });
  };
  static handleClickService = async (template: any, downloadNotebook: any) => {
    const notebookUrl = template.url;
    loggedFetch(notebookUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github.raw'
      }
    })
      .then((response: Response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch notebook content. Status: ${response.status}`
          );
        }
        return response.json();
      })
      .then((notebookContent: string) => {
        downloadNotebook(notebookContent, notebookUrl);
      })
      .catch((err: Error) => {
        console.error('Error fetching notebook content', err);
      });
  };
}
export default NotebookTemplateService;
