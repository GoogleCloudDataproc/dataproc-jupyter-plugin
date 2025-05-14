import React from 'react';
import { LabIcon } from '@jupyterlab/ui-components';
import signinGoogleIcon from '../../style/icons/signin_google_icon.svg';
import { login } from './utils';

// Create the Google Sign-in Icon
const IconsigninGoogle = new LabIcon({
  name: 'launcher:signin_google_icon',
  svgstr: signinGoogleIcon
});

interface LoginErrorProps {
  loginError?: boolean;
  configError?: boolean;
  setLoginError: React.Dispatch<React.SetStateAction<boolean>>;
}

const LoginErrorComponent: React.FC<LoginErrorProps> = ({ 
  loginError = false, 
  configError = false, 
  setLoginError 
}) => {
  if (configError) {
    return (
      <div className="login-error">
        Please configure gcloud with account, project-id and region
      </div>
    );
  }

  if (loginError) {
    return (
      <>
        <div className="login-error">Please login to continue</div>
        <div style={{ alignItems: 'center' }}>
          <div
            role="button"
            className='signin-google-icon'
            onClick={() => login(setLoginError)}
          >
            <IconsigninGoogle.react
              tag="div"
              className="logo-alignment-style"
            />
          </div>
        </div>
      </>
    );
  }

  return null;
};

export default LoginErrorComponent;