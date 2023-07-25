import React from 'react';
import { Modal } from 'semantic-ui-react';

function DeletePopup({ onCancel, onDelete, deletePopupOpen, DeleteMsg }: any) {
  const modalStyle = {
    width: 'auto', // Set the desired width
    backgroundColor: 'white' // Set the desired background color
  };
  return (
    <Modal open={deletePopupOpen} onClose={onCancel} style={modalStyle}>
      <div className="popup-main">
        <div className="popup-header">Confirm deletion</div>

        <div className="popup-text">{DeleteMsg}</div>

        <div className="popup-buttons">
          <div className="popup-button-style" onClick={onCancel}>
            CANCEL
          </div>
          <div className="popup-button-style" onClick={onDelete}>
            DELETE
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default DeletePopup;
