import React from 'react';
import { IconError } from '../../utils/icons';

interface ErrorMessageInterface {
    message: string
}

const ErrorMessage: React.FC<ErrorMessageInterface> = ({ message }) => {
    return (
        <div className="error-key-parent">
            <IconError.react tag="div" className="logo-alignment-style" />
            <div className="error-key-missing">
                {message}
            </div>
        </div>
    )
}

export default ErrorMessage;