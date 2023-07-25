import React from 'react';

function GlobalFilter({
  globalFilter,
  setGlobalFilter,
  setPollingDisable
}: any) {
  const [value, setValue] = React.useState(globalFilter);
  const onChange = (value: any) => {
    setGlobalFilter(value || undefined);
  };
  if (value !== undefined) {
    if (value.length !== 0) {
      setPollingDisable(true);
    } else {
      setPollingDisable(false);
    }
  }

  return (
    <span>
      <input
        value={value || ''}
        onChange={e => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
        placeholder={'Filter Table'}
        className="filter-section-part"
      />
    </span>
  );
}

export default GlobalFilter;
