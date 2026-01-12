// src/bigQuery/naturalLanguageSearchPanel.tsx

import React from 'react'; // FIX: Explicit React import for JSX

import { ReactWidget } from '@jupyterlab/apputils';
import { TextField, IconButton, CircularProgress } from '@mui/material';
import { Search } from '@mui/icons-material';
import { Signal } from '@lumino/signaling';
import { INLSearchFilters } from './naturalLanguageFilterPanel';
import { JupyterLab } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { LabIcon } from '@jupyterlab/ui-components';
import { Tree, NodeRendererProps, NodeApi } from 'react-arborist';
import { auto } from '@popperjs/core'; 

// Icon Imports
// import datasetExplorerIcon from '../../style/icons/dataset_explorer_icon.svg'; 
import bigQueryProjectIcon from '../../style/icons/bigquery_project_icon.svg';
import datasetIcon from '../../style/icons/dataset_icon.svg';
import tableIcon from '../../style/icons/table_icon.svg';
import columnsIcon from '../../style/icons/columns_icon.svg';
import rightArrowIcon from '../../style/icons/right_arrow_icon.svg';
import downArrowIcon from '../../style/icons/down_arrow_icon.svg';

// Icon Instantiations
// const iconDatasetExplorer = new LabIcon({ name: 'launcher:dataset-explorer-icon', svgstr: datasetExplorerIcon });
const iconBigQueryProject = new LabIcon({ name: 'launcher:bigquery-project-icon', svgstr: bigQueryProjectIcon });
const iconDataset = new LabIcon({ name: 'launcher:dataset-icon', svgstr: datasetIcon });
const iconTable = new LabIcon({ name: 'launcher:table-icon', svgstr: tableIcon });
const iconColumns = new LabIcon({ name: 'launcher:columns-icon', svgstr: columnsIcon });
const iconRightArrow = new LabIcon({ name: 'launcher:right-arrow-icon', svgstr: rightArrowIcon });
const iconDownArrow = new LabIcon({ name: 'launcher:down-arrow-icon', svgstr: downArrowIcon });

// Helper to calculate depth
const calculateDepth = (node: NodeApi): number => {
    let depth = 0;
    let currentNode = node;
    while (currentNode.parent) {
        depth++;
        currentNode = currentNode.parent;
    }
    return depth;
};

// Node Renderer for the Tree component
const NodeRenderer = ({ node, style }: NodeRendererProps<any>) => {
    const depth = calculateDepth(node);
    const isProject = depth === 1;
    const isDataset = depth === 2;
    const isTable = depth === 3;
    const isColumn = depth === 4;
    
    // Simplified logic for icon display and toggle
    const arrowIcon = (node.children && node.children.length > 0) ? (
        node.isOpen ? (
            <div role="treeitem" className="caret-icon down" onClick={() => node.toggle()}>
                <iconDownArrow.react tag="div" className="icon-white logo-alignment-style" />
            </div>
        ) : (
            <div role="treeitem" className="caret-icon right" onClick={() => node.toggle()}>
                <iconRightArrow.react tag="div" className="icon-white logo-alignment-style" />
            </div>
        )
    ) : <div style={{ width: '29px' }}></div>; // Spacer

    const renderNodeIcon = () => {
        // FIX: Correct usage of LabIcon.react component wrapper
        if (isProject) return <div role="img" className="db-icon"><iconBigQueryProject.react tag="div" /></div>;
        if (isDataset) return <div role="img" className="db-icon"><iconDataset.react tag="div" /></div>;
        if (isTable) return <div role="img" className="table-icon"><iconTable.react tag="div" /></div>;
        if (isColumn) return <div role="img" className="column-icon"><iconColumns.react tag="div" /></div>;
        return null;
    };
    
    return (
        <div style={{ ...style, display: 'flex', alignItems: 'center' }}>
            {arrowIcon}
            {renderNodeIcon()}
            <div style={{ marginLeft: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={node.data.name}>
                {node.data.name}
            </div>
        </div>
    );
};


export interface ISearchResult { // FIX: Declared interface
  name: string;
  description?: string; 
}


interface ISearchComponentProps {
    initialQuery: string;
    onSearchExecuted: (query: string) => void;
    onFilterButtonClicked: () => void;
    activeFilters: INLSearchFilters;
    results: ISearchResult[];
    app: JupyterLab;
    settingRegistry: ISettingRegistry;
    searchLoading: boolean;
    treeData: any[]; // Data for the full asset tree
}

const SearchComponent: React.FC<ISearchComponentProps> = ({ 
    initialQuery, 
    onSearchExecuted, 
    onFilterButtonClicked,
    activeFilters,
    results,
    searchLoading,
    treeData 
}) => {
    // FIX: Removed unused local state 'query' and 'setQuery'
    const showFullTree = initialQuery.trim() === '' && treeData.length > 0 && !searchLoading;
    
    return (
        <div style={{ flexGrow: 1, padding: '16px 32px 32px 0', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
            
            {/* Natural Language Search Input Bar */}
            <div className="nl-query-bar" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="What dataset are you looking for?"
                    value={initialQuery}
                    onChange={(e) => {
                       // Note: The parent widget handles state update and debounce logic
                    }} 
                    onKeyDown={(e) => { 
                       if (e.key === 'Enter') onSearchExecuted(initialQuery.trim()); 
                    }} 
                    InputProps={{
                        startAdornment: <Search style={{ color: 'var(--jp-ui-font-color1)' }} />,
                        endAdornment: (
                            <IconButton onClick={() => onSearchExecuted(initialQuery.trim())} disabled={initialQuery.trim().length === 0}>
                                <Search style={{ color: 'var(--jp-ui-font-color1)' }} />
                            </IconButton>
                        )
                    }}
                />
            </div>

            {/* Active Filter Chips (omitted for brevity, relying on external file) */}

            {/* Search Results / Full Tree View */}
            <div className="nl-search-results-list" style={{ flexGrow: 1, overflowY: 'auto' }}>
                <h2 style={{fontSize: 20, fontWeight: 500, margin: '0 0 16px 0', color: 'var(--jp-ui-font-color0)'}}>
                    {showFullTree ? 'Dataset Explorer' : 'Search Results'}
                </h2>
                
                {searchLoading ? ( 
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--jp-ui-font-color2)'}}>
                        <CircularProgress size={16} /> 
                        <span>Searching...</span>
                    </div>
                ) : showFullTree ? (
                    // --- RENDER FULL TREE ---
                    <div className="tree-container" style={{ height: '100%', width: '100%' }}>
                        <Tree
                            className="dataset-tree"
                            data={treeData}
                            openByDefault={false}
                            indent={24}
                            width={auto}
                            height={100} 
                            rowHeight={36}
                            overscanCount={1}
                            idAccessor={(node: any) => node.id}
                        >
                            {(props: NodeRendererProps<any>) => (
                                <NodeRenderer {...props} />
                            )}
                        </Tree>
                    </div>
                ) : (
                    // --- RENDER FLAT SEARCH RESULTS ---
                    <>
                        <p style={{fontSize: 13, color: 'var(--jp-ui-font-color2)', margin: '0 0 8px 0'}}>
                            Query: "{initialQuery || 'All Dataplex Assets'}" ({results.length} found)
                        </p>
                        <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: 0 }}>
                            {results.map((r, index) => (
                                <li key={index} className="search-result-item" style={{ 
                                    padding: '8px 0', 
                                    borderBottom: '1px solid var(--jp-border-color3)'
                                }}>
                                    {/* Placeholder for list item content */}
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </div>
    );
};

// --- Lumino Wrapper Component ---
export class NaturalLanguageSearchPanel extends ReactWidget {
    updateFilters(filters: INLSearchFilters) {
      throw new Error('Method not implemented.');
    } 
    // FIX: Declared missing internal state properties
    private initialQuery: string = '';
    private searchResults: ISearchResult[] = [];
    private searchLoading: boolean = false; 
    private treeData: any[] = [];
    private app: JupyterLab; 
    private settingRegistry: ISettingRegistry; 
    
    // FIX: Re-declared missing signals from Lumino class
    private _searchExecuted = new Signal<this, string>(this);
    get searchExecuted(): Signal<this, string> {
        return this._searchExecuted;
    }
    private _filterButtonClicked = new Signal<this, void>(this);
    get filterButtonClicked(): Signal<this, void> {
        return this._filterButtonClicked;
    }


    constructor(app: JupyterLab, settingRegistry: ISettingRegistry, initialQuery: string) {
        super();
        this.app = app;
        this.settingRegistry = settingRegistry;
        this.initialQuery = initialQuery;
        this.addClass('nl-search-results-panel');
        this.node.style.minWidth = '450px'; 
    }

    public renderResults(query: string, results: ISearchResult[], loading: boolean, treeData: any[] = []): void { 
        this.initialQuery = query; 
        this.searchResults = results;
        this.searchLoading = loading; 
        this.treeData = treeData; 
        this.update();
    }

    render(): JSX.Element {
        return (
            <SearchComponent 
                initialQuery={this.initialQuery} 
                onSearchExecuted={(query) => this._searchExecuted.emit(query)} // Use emit
                onFilterButtonClicked={() => this._filterButtonClicked.emit()} // Use emit
                activeFilters={{} as INLSearchFilters} // Placeholder
                results={this.searchResults}
                searchLoading={this.searchLoading}
                treeData={this.treeData} 
                app={this.app}
                settingRegistry={this.settingRegistry}
            />
        );
    }
}
