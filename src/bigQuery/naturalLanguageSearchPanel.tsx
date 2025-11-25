import { ReactWidget } from '@jupyterlab/apputils';
import React, { useState } from 'react';
import { TextField, IconButton } from '@mui/material';
import { Search } from '@mui/icons-material';
import { Signal } from '@lumino/signaling';
import { INLSearchFilters } from './naturalLanguageFilterPanel';
import { JupyterLab } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { LabIcon } from '@jupyterlab/ui-components';
import datasetExplorerIcon from '../../style/icons/dataset_explorer_icon.svg'; // Icon for result item

const iconDatasetExplorer = new LabIcon({
  name: 'launcher:dataset-explorer-icon',
  svgstr: datasetExplorerIcon
});

export interface ISearchResult {
  name: string;
  description?: string; // <-- ADDED: For metadata below the name (e.g., project > region)
}

// Interface for API filtering parameters - needed for clarity
// interface IFilterArgs {
//     type: string;
//     system: string;
// }

interface ISearchComponentProps {
    initialQuery: string;
    onSearchExecuted: (query: string) => void;
    onFilterButtonClicked: () => void;
    activeFilters: INLSearchFilters;
    results: ISearchResult[];
    app: JupyterLab;
    settingRegistry: ISettingRegistry;
}

const SearchComponent: React.FC<ISearchComponentProps> = ({ 
    initialQuery, 
    onSearchExecuted, 
    onFilterButtonClicked,
    activeFilters,
    results
    // app and settingRegistry are passed but not used directly in this presentation component
}) => {
    const [query, setQuery] = useState(initialQuery);

    const handleSearch = () => {
        if (query.trim() || Object.values(activeFilters).some(v => v)) {
            // Execute search even if query is empty but filters are set
            onSearchExecuted(query.trim());
        } else {
            // Execute a broad search if everything is empty for initial display
            onSearchExecuted('');
        }
    };
    
    // Function to render active filter chips
    const renderFilterChips = () => {
        const chips: JSX.Element[] = [];
        Object.entries(activeFilters).forEach(([key, value]) => {
            if (value && value !== 'select' && value !== '') {
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                chips.push(
                    <div key={key} className="nl-filter-chip" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '4px 8px', 
                        borderRadius: '16px', 
                        backgroundColor: 'var(--jp-layout-color2)', 
                        fontSize: '12px' 
                    }}>
                        <span style={{color: 'var(--jp-ui-font-color1)'}}>{label}: {value}</span>
                        {/* Note: The close button logic is omitted for brevity but should be added */}
                        <IconButton size="small" style={{marginLeft: 4, padding: 0}}>✖</IconButton>
                    </div>
                );
            }
        });
        return chips;
    };


    return (
        <div style={{ flexGrow: 1, padding: '16px 32px 32px 0', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
            
            {/* Natural Language Search Input Bar */}
            <div className="nl-query-bar" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="What dataset are you looking for?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    // Execute search on Enter key press
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }} 
                    InputProps={{
                        startAdornment: <Search style={{ color: 'var(--jp-ui-font-color1)' }} />,
                        endAdornment: (
                            // Add search button at the end
                            <IconButton onClick={handleSearch} disabled={query.trim().length === 0}>
                                <Search style={{ color: 'var(--jp-ui-font-color1)' }} />
                            </IconButton>
                        )
                    }}
                />
            </div>

            {/* Active Filter Chips */}
            <div className="nl-filter-chips-area" style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <span className="nl-filter-chips-title" style={{ color: 'var(--jp-ui-font-color2)', fontWeight: 500, flexShrink: 0 }}>Filters:</span>
                <div className="nl-filter-chips-container" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {renderFilterChips().length > 0 ? renderFilterChips() : <span style={{color: 'var(--jp-ui-font-color2)'}}>No active filters.</span>}
                </div>
            </div>

            {/* Search Results */}
            <div className="nl-search-results-list" style={{ flexGrow: 1, overflowY: 'auto' }}>
                <h2 style={{fontSize: 20, fontWeight: 500, margin: '0 0 16px 0', color: 'var(--jp-ui-font-color0)'}}>Search Results</h2>
                <p style={{fontSize: 13, color: 'var(--jp-ui-font-color2)', margin: '0 0 8px 0'}}>Query: "{query || 'all assets'}" ({results.length} found)</p>
                <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: 0 }}>
                    {results.map((r, index) => (
                        <li key={index} className="search-result-item" style={{ 
                            padding: '8px 0', 
                            borderBottom: '1px solid var(--jp-border-color2)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {/* Title/Name */}
                                <div style={{color: 'var(--jp-ui-font-color0)', fontSize: 13, fontWeight: '500'}}>{r.name}</div>
                            </div>
                            
                            {/* Description/Metadata (Figma Style) */}
                            {r.description && (
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 4, 
                                    paddingLeft: 0, 
                                    marginTop: 4 
                                }}>
                                    <div style={{width: 14, height: 14, flexShrink: 0}}>
                                         <iconDatasetExplorer.react tag="div"/> 
                                    </div>
                                    <div style={{color: 'var(--jp-ui-font-color2)', fontSize: 13}}>
                                        {r.description}
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

        </div>
    );
};

// --- Lumino Wrapper Component ---
export class NaturalLanguageSearchPanel extends ReactWidget {
    // Signals for parent communication
    private _searchExecuted = new Signal<this, string>(this);
    get searchExecuted(): Signal<this, string> {
        return this._searchExecuted;
    }

    private _filterButtonClicked = new Signal<this, void>(this);
    get filterButtonClicked(): Signal<this, void> {
        return this._filterButtonClicked;
    }
    
    private initialQuery: string = '';
    private activeFilters: INLSearchFilters = {} as INLSearchFilters;
    private searchResults: ISearchResult[] = [];
    private app: JupyterLab;
    private settingRegistry: ISettingRegistry;

    constructor(
        app: JupyterLab,
        settingRegistry: ISettingRegistry,
        initialQuery: string) {
        super();
        this.app = app;
        this.settingRegistry = settingRegistry;
        this.initialQuery = initialQuery;
        this.addClass('nl-search-results-panel');
        this.node.style.minWidth = '450px'; // Ensure panel is wide enough
    }
    
    public updateFilters(filters: INLSearchFilters): void {
        this.activeFilters = filters;
        this.update(); // Re-render the React component
    }

    public renderResults(query: string, results: ISearchResult[]): void {
        this.initialQuery = query; // Update query display
        this.searchResults = results;
        this.update(); // Re-render the React component
    }

    private handleSearchExecution = (query: string) => {
        this._searchExecuted.emit(query);
    }
    
    private handleFilterButtonClick = () => {
        this._filterButtonClicked.emit();
    }

    render(): JSX.Element {
        return (
            <SearchComponent 
                initialQuery={this.initialQuery} 
                onSearchExecuted={this.handleSearchExecution}
                onFilterButtonClicked={this.handleFilterButtonClick}
                activeFilters={this.activeFilters}
                results={this.searchResults}
                app={this.app}
                settingRegistry={this.settingRegistry}
            />
        );
    }
}
