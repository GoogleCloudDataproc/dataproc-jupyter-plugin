import React from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import errorIcon from '../../../style/icons/error_icon.svg';

const iconError = new LabIcon({
    name: 'launcher:error-icon',
    svgstr: errorIcon
});

interface ErrorMessageInterface {
    message: string
}

const ErrorMessage: React.FC<ErrorMessageInterface> = ({ message }) => {

    return (
        <div className="error-key-parent">
            <iconError.react tag="div" className="logo-alignment-style" />
            <div className="error-key-missing">
                {message}
            </div>
        </div>
    )
}

export default ErrorMessage;