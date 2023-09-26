import React from 'react';
import { ReactWidget, IThemeManager } from '@jupyterlab/apputils';
import { ThemeOptions, ThemeProvider, createTheme } from '@mui/material';
import { deepmerge } from '@mui/utils';

const baseStyles: ThemeOptions = {
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minWidth: 48
        }
      },
      defaultProps: {
        size: 'small'
      }
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: 13
        },
        input: {
          fontSize: 13
        }
      },
      defaultProps: {
        size: 'small'
      }
    },
    MuiAutocomplete: {
      styleOverrides: {
        option: {
          fontSize: 13
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: 13,
          transform: 'translate(14px, 9px) scale(1)'
        },
        shrink: {
          fontSize: 14,
          transform: 'translate(12px, -7px) scale(0.75)'
        }
      }
    }
  }
};

/**
 * Theme to use when the current Jupyter Theme is light.
 */
export const lightTheme = createTheme(
  deepmerge(baseStyles, {
    palette: {
      mode: 'light'
    },
    components: {
      MuiOutlinedInput: {
        styleOverrides: {
          notchedOutline: {
            borderColor: 'rgba(0,0,0,0.38)'
          }
        }
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            color: '#000'
          }
        }
      }
    }
  })
);

/**
 * Theme to use when the current Jupyter Theme is dark.
 */
export const darkTheme = createTheme(
  deepmerge(baseStyles, {
    palette: {
      mode: 'dark',
      primary: {
        main: '#FF0064'
      },
      secondary: {
        main: '#7000F2'
      }
    }
  })
);

/**
 * Base Widget class that injects MUI themeprovider context so
 * mui components will update when the jupyter theme changes.
 * TODO: Add auth context provider here?
 */
export abstract class DataprocWidget extends ReactWidget {
  /**
   * Whether or not currently jupyter is displaying a light theme.
   */
  isLight: boolean = true;

  /**
   * @param themeManager Need thememanager to listen to theme changes
   *   and to retrieve current theme properties.
   */
  constructor(protected themeManager: IThemeManager) {
    super();
    this.themeManager.themeChanged.connect(this.onThemeChanged, this);
    this.updateIsLight();
  }

  /**
   * Updates the isLight property based on current theme properties.
   * @returns Whether or not isLight is updated based on the current theme.
   */
  private updateIsLight() {
    const prevIsLight = this.isLight;
    const currentTheme = this.themeManager.theme;
    if (currentTheme) {
      this.isLight = this.themeManager.isLight(currentTheme);
    } else {
      this.isLight = true;
    }
    return this.isLight !== prevIsLight;
  }

  private onThemeChanged() {
    if (this.updateIsLight()) {
      // Force a rerender if the theme has changed.
      this.update();
    }
  }

  dispose() {
    this.themeManager.themeChanged.disconnect(this.onThemeChanged, this);
    return super.dispose();
  }

  /**
   * Renders the theme context providers as well as the child components
   * as specified by renderInternal.
   */
  protected render(): React.ReactElement {
    return (
      <ThemeProvider theme={this.isLight ? lightTheme : darkTheme}>
        {this.renderInternal()}
      </ThemeProvider>
    );
  }

  /**
   * Child classes are expected to implement this instead of render().
   */
  protected abstract renderInternal(): React.ReactElement;
}
