/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';

export const TitleComponent = function ({
  titleStr,
  isPreview,
  styles
}: {
  titleStr: string;
  isPreview: boolean;
  styles?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        padding: '8px 12px',
        textTransform: 'none',
        fontFamily: 'Roboto',
        fontSize: '15px',
        fontWeight: 600,
        letterSpacing: 0,
        ...styles
      }}
    >
      <span>{titleStr}</span>
      {isPreview ? (
        <span
          style={{
            marginLeft: '5px',
            fontSize: '13px',
            padding: '2px',
            backgroundColor: 'var(--jp-inverse-layout-color2)',
            color: 'var(--jp-ui-inverse-font-color1)'
          }}
        >
          PREVIEW
        </span>
      ) : null}
    </div>
  );
};

export class TitleWidget extends ReactWidget {
  constructor(private titleStr: string, private isPreview: boolean) {
    super();
  }
  render() {
    return (
      <TitleComponent titleStr={this.titleStr} isPreview={this.isPreview} />
    );
  }
}
