import React, { useState } from 'react';
import Button from '@mui/material/Button';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material';
import { LabIcon } from '@jupyterlab/ui-components';
import expandLessIcon from '../../style/icons/expand_less.svg';
import expandMoreIcon from '../../style/icons/expand_more.svg';
import deleteIcon from '../../style/icons/scheduler_delete.svg';
interface IImportErrorPopupProps {
  importErrorData: string[];
  importErrorEntries: number;
  importErrorPopupOpen: boolean;
  onClose: () => void;
  onDelete: (dagId: string) => void;
}

export default function ImportErrorPopup({
  importErrorData,
  importErrorEntries,
  importErrorPopupOpen,
  onClose,
  onDelete
}: IImportErrorPopupProps) {
  const [activeIndexes, setActiveIndexes] = useState<number[]>([]);

  const iconExpandLess = new LabIcon({
    name: 'launcher:expand-less-icon',
    svgstr: expandLessIcon
  });
  const iconExpandMore = new LabIcon({
    name: 'launcher:expand-more-icon',
    svgstr: expandMoreIcon
  });

  const iconDelete = new LabIcon({
    name: 'launcher:delete-icon',
    svgstr: deleteIcon
  });

  const formatDate = (timestamp: string) => {
    const dateObj = new Date(timestamp);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const formattedTime = dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    return `${formattedDate}, ${formattedTime}`;
  };

  const toggleAccordion = (index: number) => {
    const currentIndex = activeIndexes.indexOf(index);
    const newActiveIndexes = [...activeIndexes];
    if (currentIndex === -1) {
      newActiveIndexes.push(index);
    } else {
      newActiveIndexes.splice(currentIndex, 1);
    }
    setActiveIndexes(newActiveIndexes);
  };
  const handleDelete = (filename: string) => {
    let dagId = filename.substring(filename.lastIndexOf('/') + 1);
    dagId = dagId.split('_')[1].split('.')[0]
    if (dagId) onDelete(dagId);
  };

  return (
    <>
      {importErrorData && importErrorData.length > 0 ? (
        <React.Fragment>
          <Dialog
            fullWidth
            maxWidth="xl"
            open={importErrorPopupOpen}
            onClose={onClose}
          >
            <DialogTitle className="accordion-content">
              Schedule Errors ({importErrorEntries})
            </DialogTitle>
            <DialogContent>
              <div className="accordion">
                {importErrorData.map((section: any, index: number) => {
                  return (
                    <div key={index} className="accordion-section">
                      <div
                        className={`accordion-title ${
                          activeIndexes.includes(index) ? 'active' : ''
                        }`}
                        onClick={() => toggleAccordion(index)}
                      >
                        <span className="filename">
                          {section.filename.split('/').pop()}
                        </span>
                        <span className="timestamp">
                          {formatDate(section.timestamp)}
                        </span>

                        <div
                          role="button"
                          className="icon-buttons-style"
                          title="Delete"
                          onClick={(e: any) => {
                            e.stopPropagation(); // Prevent accordion toggle when deleting
                            handleDelete(section.filename);
                          }}
                        >
                          <iconDelete.react
                            tag="div"
                            className="icon-white logo-alignment-style"
                          />
                        </div>
                        {activeIndexes.includes(index) ? (
                          <iconExpandLess.react
                            tag="div"
                            className="icon-white logo-alignment-style-accordion"
                          />
                        ) : (
                          <iconExpandMore.react
                            tag="div"
                            className="icon-white logo-alignment-style-accordion"
                          />
                        )}
                      </div>
                        {activeIndexes.includes(index) && (
                          <pre className="accordion-content">
                            {section.stack_trace}
                          </pre>
                        )}
                      </div>
                  );
                })}
              </div>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Close</Button>
            </DialogActions>
          </Dialog>
        </React.Fragment>
      ) : (
        <Dialog open={importErrorPopupOpen} onClose={onClose}>
          <DialogTitle>No Import Errors</DialogTitle>
          <DialogActions>
            <Button onClick={onClose}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
