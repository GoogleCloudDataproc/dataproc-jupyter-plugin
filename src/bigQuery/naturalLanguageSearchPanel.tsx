import { ReactWidget } from '@jupyterlab/apputils';
import React, { useState } from 'react';
import { TextField, IconButton } from '@mui/material';
import { Search } from '@mui/icons-material';
import { Signal } from '@lumino/signaling';
import { INLSearchFilters } from './naturalLanguageFilterPanel'; // Import filter types

export interface ISearchResult {
  name: string;
}

// --- React Functional Component ---
interface ISearchComponentProps {
    initialQuery: string;
    onSearchExecuted: (query: string) => void;
    onFilterButtonClicked: () => void;
    activeFilters: INLSearchFilters;
    results: ISearchResult[];
}

const SearchComponent: React.FC<ISearchComponentProps> = ({ 
    initialQuery, 
    onSearchExecuted, 
    onFilterButtonClicked,
    activeFilters,
    results 
}) => {
    const [query, setQuery] = useState(initialQuery);

    const handleSearch = () => {
        if (query.trim()) {
            onSearchExecuted(query.trim());
        }
    };
    
    // Function to render active filter chips
    const renderFilterChips = () => {
        const chips: JSX.Element[] = [];
        Object.entries(activeFilters).forEach(([key, value]) => {
            if (value && value !== 'select' && value !== '') {
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                chips.push(
                    <div key={key} className="nl-filter-chip">
                        <span>{label}: {value}</span>
                        <IconButton size="small" style={{marginLeft: 4, padding: 0}}>✖</IconButton>
                    </div>
                );
            }
        });
        return chips;
    };


    return (
        <div style={{ flexGrow: 1, padding: '16px 32px 32px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Natural Language Search Input Bar */}
            <div className="nl-query-bar" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="What dataset are you looking for?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                    InputProps={{
                        startAdornment: <Search style={{ color: 'var(--jp-ui-font-color1)' }} />,
                        endAdornment: (
                            <IconButton onClick={handleSearch} disabled={query.trim().length === 0}>
                            </IconButton>
                        )
                    }}
                />
            </div>

            {/* Active Filter Chips */}
            <div className="nl-filter-chips-area" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span className="nl-filter-chips-title" style={{ color: 'var(--jp-ui-font-color2)', fontWeight: 500 }}>Filters:</span>
                <div className="nl-filter-chips-container" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {renderFilterChips().length > 0 ? renderFilterChips() : <span>No active filters.</span>}
                </div>
                {/* We rely on the search bar design not having a separate Filter button, 
                    but keep the functionality available if needed: */}
                {/* <button onClick={onFilterButtonClicked}>⚙️</button> */}
            </div>

            {/* Search Results */}
            <div className="nl-search-results-list">
                <h2>Search Results</h2>
                <p>Query: {query} ({results.length} found)</p>
                <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                    {results.map((r, index) => <li key={index} className="search-result-item">{r.name}</li>)}
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
    
    constructor(initialQuery: string) {
        super();
        this.initialQuery = initialQuery;
        this.addClass('nl-search-results-panel');
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
            />
        );
    }
}
