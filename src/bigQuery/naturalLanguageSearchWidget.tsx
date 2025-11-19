import { Panel } from '@lumino/widgets'; 
import { JupyterLab } from '@jupyterlab/application';
import { IThemeManager } from '@jupyterlab/apputils';

import { 
  NaturalLanguageSearchFilterPanel, 
  INLSearchFilters, 
  // Get INLSearchFilters from the React-based file
} from './naturalLanguageFilterPanel'; 
import { NaturalLanguageSearchPanel, ISearchResult } from './naturalLanguageSearchPanel'; 

const TOGGLE_FILTER_COMMAND = 'bigquery:toggle-nl-search-filters';

export class NaturalLanguageSearchWidget extends Panel { 
  private app: JupyterLab;
  private filterPanel: NaturalLanguageSearchFilterPanel;
  private searchPanel: NaturalLanguageSearchPanel;
  private currentQuery: string = '';

  constructor(app: JupyterLab, themeManager: IThemeManager, initialSearchTerm: string = '') {
    super(); 
    this.app = app;
    this.currentQuery = initialSearchTerm;

    this.title.label = 'NL Dataset Search';
    this.addClass('jp-NaturalLanguageSearchWidget');
    
    // 1. Setup Flexbox Layout
    this.node.style.display = 'flex';
    this.node.style.flexDirection = 'row';
    this.node.style.height = '100%';
    this.node.style.gap = '16px'; 

    // 2. Instantiate Children
    this.filterPanel = new NaturalLanguageSearchFilterPanel();
    // Pass initialQuery to the SearchPanel constructor
    this.searchPanel = new NaturalLanguageSearchPanel(initialSearchTerm); 
    
    // 3. Add Children
    this.addWidget(this.filterPanel); 
    this.addWidget(this.searchPanel); 

    // 4. Connect Signals
    this.filterPanel.filtersChanged.connect(this.handleFilterChange, this);
    this.searchPanel.searchExecuted.connect(this.handleSearchExecution, this);
    this.searchPanel.filterButtonClicked.connect(this.handleFilterButtonClick, this);
    
    // 5. Setup Toggle Command (remains the same)
    // this.setupToggleCommand();

    // 6. Run initial search
    this.runSearch();
  }

  // --- Logic and Signal Handlers ---

  private handleFilterChange(sender: NaturalLanguageSearchFilterPanel, filters: INLSearchFilters): void {
    // Tell the search panel to update its chip display
    this.searchPanel.updateFilters(filters); 
    this.runSearch();
  }

  private handleSearchExecution(sender: NaturalLanguageSearchPanel, query: string): void {
    this.currentQuery = query;
    this.runSearch();
  }
  
  private handleFilterButtonClick(): void {
    // This part is retained if the search panel button should toggle the filter visibility
    this.app.commands.execute(TOGGLE_FILTER_COMMAND);
  }
  
  private runSearch(): void {
    const filters = this.filterPanel.getFilterValues();
    const query = this.currentQuery || 'What datasets are related to finance?';
    
    // --- Mock API Response ---
    const mockResults: ISearchResult[] = [
        { name: `${query} (Filtered by ${filters.type || 'All'})` },
        { name: 'Dataset B' }
    ];

    // Pass results to the SearchPanel for rendering
    this.searchPanel.renderResults(query, mockResults);
  }

  // ... setupToggleCommand (remains the same as the previous non-SplitPanel version)
}
