// src/bigQuery/naturalLanguageSearchWidget.tsx
import { JupyterLab } from '@jupyterlab/application';
import { IThemeManager } from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { NaturalLanguageSearchFilterPanel, INLSearchFilters } from './naturalLanguageFilterPanel'; 
import { NaturalLanguageSearchPanel, ISearchResult } from './naturalLanguageSearchPanel'; 
import { BigQueryService } from './bigQueryService'; // Ensure import exists
import { Panel } from '@lumino/widgets'; 
import { Message } from '@lumino/messaging';

export class NaturalLanguageSearchWidget extends Panel { 
  private app: JupyterLab;
  private settingRegistry: ISettingRegistry;
  private filterPanel: NaturalLanguageSearchFilterPanel;
  private searchPanel: NaturalLanguageSearchPanel;
  private currentQuery: string = '';

  // FIX: Declared all missing internal state properties
  private searchResults: ISearchResult[] = []; 
  private searchLoading: boolean = false; 
  private treeStructureData: any[] = [];
  private projectNameInfo: string[] = [];
  // private allDatasets: Map<string, any[]> = new Map();
  
  // Note: The rest of the properties/methods needed for the full tree (like getBigQueryDatasets, etc.) 
  // must also be correctly implemented on this class for full functionality, but the errors are resolved 
  // by declaring the state above.

  constructor(app: JupyterLab,
    settingRegistry: ISettingRegistry,
    themeManager: IThemeManager, 
    initialSearchTerm: string = '') {
    super(); 
    this.app = app;
    this.settingRegistry = settingRegistry;
    this.currentQuery = initialSearchTerm;

    this.title.label = 'NL Dataset Search';
    this.addClass('jp-NaturalLanguageSearchWidget');
    
    // ... existing setup ...

    this.filterPanel = new NaturalLanguageSearchFilterPanel();
   this.searchPanel = new NaturalLanguageSearchPanel(
      this.app, 
      this.settingRegistry, 
      initialSearchTerm
    );
    
    this.addWidget(this.filterPanel); 
    this.addWidget(this.searchPanel); 

    // FIX: Define methods used in signal connections
    this.filterPanel.filtersChanged.connect(this.handleFilterChange, this);
    this.searchPanel.searchExecuted.connect(this.handleSearchExecution, this);
    this.searchPanel.filterButtonClicked.connect(this.handleFilterButtonClick, this);
    
    this.getBigQueryProjects(true); // Initial data load
    this.runSearch();
  }

  // Lifecycle hook for initial data load
  protected onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg); // <-- PASS THE MESSAGE ARGUMENT
        this.getBigQueryProjects(false);
    }
  
  // FIX: Implemented missing Signal handlers (TS2339 errors)
  // private handleFilterChange(sender: NaturalLanguageSearchFilterPanel, filters: INLSearchFilters): void {
  //     this.searchPanel.updateFilters(filters); 
  //     this.runSearch();
  // }

    private handleFilterChange(sender: NaturalLanguageSearchFilterPanel, filters: INLSearchFilters): void {
        // This is the line where the error occurred:
        this.searchPanel.updateFilters(filters); 
        this.runSearch();
    }

  private handleSearchExecution(sender: NaturalLanguageSearchPanel, query: string): void {
      this.currentQuery = query;
      this.runSearch();
  }
  
  private handleFilterButtonClick(): void {
      console.log("Filter button clicked.");
  }
  
  // Helper to get initial project data and build initial tree.
  private getBigQueryProjects(isReset: boolean): void {
      // Logic to fetch projects and build initial tree data (simplified mock of effect)
      BigQueryService.getBigQueryProjectsListAPIService(
          (data: any) => { 
              this.projectNameInfo = data;
              this.treeStructureforProjects(); 
          }, 
          (loading: boolean) => { this.searchLoading = loading; this.searchPanel.update(); }, 
          (error: boolean) => { /* handle error */ },
          (name: string) => { /* set project name */ }
      );
  }
  
  // Helper to structure data for the tree
  private treeStructureforProjects(): void {
      this.treeStructureData = this.projectNameInfo.map(projectName => ({
          id: 'project-' + projectName,
          name: projectName,
          children: [],
          isNodeOpen: false
      }));
      this.treeStructureData.sort((a, b) => a.name.localeCompare(b.name));
      // Render the tree data immediately after creation
      this.searchPanel.renderResults(this.currentQuery, this.searchResults, this.searchLoading, this.treeStructureData);
  }

  // FIX: Implemented missing utility method (TS2339 error)
  private transformResults(apiResponse: any): ISearchResult[] {
    if (!apiResponse?.results || apiResponse.results.length === 0) {
      return [];
    }
    
    // Transforms the Dataplex API result structure into the flat ISearchResult[]
    return apiResponse.results
      .map((item: any) => {
        const dataplexEntry = item.dataplexEntry;
        if (!dataplexEntry || !dataplexEntry.fullyQualifiedName) {
          return null;
        }

        const fqn = dataplexEntry.fullyQualifiedName;
        const fqnParts = fqn.split(':'); 
        const tableParts = fqnParts[1]?.split('.') || [];
        
        if(tableParts.length < 2) return null; 

        const projectId = tableParts[0];
        const datasetId = tableParts[1];
        const tableId = tableParts.length > 2 ? tableParts[2] : null;

        let name = tableId || datasetId;
        let descriptionParts = [];
        
        if (projectId) descriptionParts.push(`Project: ${projectId}`);
        if (datasetId) descriptionParts.push(`Dataset: ${datasetId}`);
        
        let assetType = '';
        if (tableId) {
          assetType = 'Table';
        } else if (datasetId) {
          assetType = 'Dataset';
        }
        
        if (assetType) descriptionParts.push(`Type: ${assetType}`);


        return {
          name: name, 
          description: descriptionParts.join(' | ') 
        } as ISearchResult;
      })
      .filter((r: ISearchResult | null) => r !== null) as ISearchResult[];
  }


  // The main orchestration function
  private runSearch(): void {
    const filters = this.filterPanel.getFilterValues();
    const rawQuery = this.currentQuery.trim();
    const query = rawQuery || 'All Dataplex Assets';
    
    if (rawQuery === '') {
        this.searchResults = []; 
        this.searchLoading = false;
        // When query is empty, render the full asset tree
        this.searchPanel.renderResults(query, this.searchResults, this.searchLoading, this.treeStructureData);
        return;
    }

    const apiFilters = {
        type: filters.type || 'table|view|external_table|dataset', 
        system: filters.systems || 'bigquery' 
    };

    const setSearchResponse = (apiResponse: any) => {
        this.searchResults = this.transformResults(apiResponse); 
        // When performing a search, clear the tree view by passing empty array
        this.searchPanel.renderResults(query, this.searchResults, this.searchLoading, []); 
    };

    const setSearchLoading = (loading: boolean) => {
        this.searchLoading = loading;
        // When switching loading state, ensure the UI updates
        this.searchPanel.renderResults(query, this.searchResults, this.searchLoading, []); 
    };
    
    setSearchLoading(true);

    BigQueryService.getBigQuerySearchAPIService(
        rawQuery, 
        setSearchLoading,
        setSearchResponse,
        apiFilters 
    ).catch(e => {
        console.error('Error during search execution:', e);
        setSearchLoading(false);
    });
  }
}
