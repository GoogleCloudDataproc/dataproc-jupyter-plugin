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
export default function ImportErrorPopup({
  importErrorData,
  importErrorEntries,
  isOpen,
  onClose
}: any) {
  // change this to interface
  const [activeIndexes, setActiveIndexes] = useState<number[]>([]);

  const iconExpandLess = new LabIcon({
    name: 'launcher:expand-less-icon',
    svgstr: expandLessIcon
  });
  const iconExpandMore = new LabIcon({
    name: 'launcher:expand-more-icon',
    svgstr: expandMoreIcon
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

  return (
    <>
      {importErrorData && importErrorData.length > 0 ? (
        <React.Fragment>
          <Dialog fullWidth maxWidth="lg" open={isOpen} onClose={onClose}>
            <DialogTitle className="accordion-content">
              Import Errors ({importErrorEntries})
            </DialogTitle>
            <DialogContent>
              <div className="accordion">
                {importErrorData.map((section: any, index: number) => (
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
                      <div className="accordion-content">
                        {section.stack_trace}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Close</Button>
            </DialogActions>
          </Dialog>
        </React.Fragment>
      ) : (
        <Dialog open={isOpen} onClose={onClose}>
          <DialogTitle>No Import Errors</DialogTitle>
          <DialogActions>
            <Button onClick={onClose}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
