import { ReactWidget } from '@jupyterlab/apputils';
import React, { useState, useEffect } from 'react';
import { 
  Select, 
  MenuItem, 
  InputLabel, 
  FormControl, 
  Button 
} from '@mui/material';
import { Signal } from '@lumino/signaling';
// import { Panel } from '@lumino/widgets'; 
// import { Close } from '@mui/icons-material'; // For potential clear icon

// --- INTERFACES ---

export interface INLSearchFilters {
  scope: string;
  systems: string;
  projects: string;
  type: string;
  subtype: string;
  locations: string;
  annotations: string;
}

const initialFilterState: INLSearchFilters = {
    scope: '',
    systems: '',
    projects: '',
    type: '',
    subtype: '',
    locations: '',
    annotations: ''
};

// --- REACT COMPONENT ---

interface IFilterComponentProps {
    onFiltersChanged: (filters: INLSearchFilters) => void;
    // onClear prop is removed as Clear button logic is contained here now.
}

const FilterComponent: React.FC<IFilterComponentProps> = ({ onFiltersChanged }) => {
    const [filters, setFilters] = useState<INLSearchFilters>(initialFilterState);

    // 1. Effect to notify the Lumino parent whenever filters change
    useEffect(() => {
        onFiltersChanged(filters);
    }, [filters, onFiltersChanged]);

    const handleChange = (name: keyof INLSearchFilters, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleClear = () => {
        setFilters(initialFilterState);
    };
    
    // Helper function to render a single dropdown
    const renderDropdown = (
        name: keyof INLSearchFilters, 
        label: string, 
        options: string[]
    ) => (
        <FormControl key={name} variant="outlined" fullWidth size="small">
            <InputLabel id={`${name}-label`}>{label}</InputLabel>
            <Select
                labelId={`${name}-label`}
                value={filters[name]}
                onChange={(e) => handleChange(name, e.target.value as string)}
                label={label}
                // Apply subtle dark mode styling override if necessary (MUI default dark theme is usually fine)
                sx={{
                    '.MuiOutlinedInput-notchedOutline': { 
                        borderColor: 'var(--jp-border-color1)' 
                    }
                }}
            >
                <MenuItem value="">{`Select ${label}`}</MenuItem>
                {options.map(opt => (
                    <MenuItem 
                        key={opt} 
                        value={opt.toLowerCase().replace(/\s/g, '-')}
                    >
                        {opt}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );

    return (
        <div style={{ 
            padding: '8px 12px 16px 12px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            width: '240px' // Match Figma width for clarity
        }}>
            {/* Header (Filters title, Clear button) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: 'var(--jp-ui-font-color1)', fontWeight: 500, margin: 0 }}>Filters</h3>
                <Button 
                    onClick={handleClear} 
                    size="small"
                    style={{ color: 'var(--jp-brand-color1)', minWidth: 'unset', padding: '2px 8px' }}
                >
                    Clear
                </Button>
            </div>
            
            {/* Separator line */}
            <hr style={{ borderTop: '1px solid var(--jp-border-color2)', margin: '4px 0 6px 0' }}/>

            {/* --- DROPDOWN LIST --- */}
            
            {/* 1. Scope */}
            {renderDropdown('scope', 'Scope', ['Current organization', 'All Organizations', 'Project'])}

            {/* 2. Systems */}
            {renderDropdown('systems', 'Systems', ['BigQuery', 'Dataplex', 'Cloud Storage'])}

            {/* 3. Projects */}
            {renderDropdown('projects', 'Projects', ['Finance', 'Marketing', 'Default'])}

            {/* 4. Type */}
            {renderDropdown('type', 'Type', ['Table', 'View', 'External Table', 'Data Stream'])}
            
            {/* 5. Subtype */}
            {renderDropdown('subtype', 'Subtype', ['Default', 'Time-series', 'Sensor'])}
            
            {/* 6. Select locations (renamed key to 'locations') */}
            {renderDropdown('locations', 'Locations', ['US-Central1', 'Europe-West4', 'Global'])}
            
            {/* 7. Annotations */}
            {renderDropdown('annotations', 'Annotations', ['Confidential', 'Public', 'PII'])}
        </div>
    );
};

// --- LUMINO WRAPPER ---

export class NaturalLanguageSearchFilterPanel extends ReactWidget {
    // We keep the Lumino Signal mechanism
    private _filtersChanged = new Signal<this, INLSearchFilters>(this);
    get filtersChanged(): Signal<this, INLSearchFilters> {
        return this._filtersChanged;
    }
    
    private currentFilters: INLSearchFilters = initialFilterState;

    constructor() {
        super();
        this.addClass('nl-search-filter-panel');
        // Node styling handled in React component's outer div for explicit width management.
        this.node.style.borderRight = '1px solid var(--jp-border-color2)'; 
        this.node.style.minWidth = '290px'; // Enforce minimum width for the sidebar container
    }

    public getFilterValues(): INLSearchFilters {
        return this.currentFilters;
    }
    
    private handleFiltersChanged = (filters: INLSearchFilters) => {
        this.currentFilters = filters;
        this._filtersChanged.emit(filters);
    };

    // The Clear button logic is now handled internally by the React component's state.
    // The Lumino parent only needs to listen to the signal.

    render(): JSX.Element {
        return <FilterComponent onFiltersChanged={this.handleFiltersChanged} />;
    }
}