import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { MainAreaWidget } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { LabIcon } from '@jupyterlab/ui-components';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { Cluster } from './cluster/cluster';
import { Serverless } from './batches/batches';
import clusterIcon from '../style/icons/cluster_icon.svg';
import serverlessIcon from '../style/icons/serverless_icon.svg';
import { Menu } from '@lumino/widgets';
import { AuthLogin } from './login/authLogin';
import { KernelSpecAPI } from '@jupyterlab/services';
import { iconDisplay } from './utils/utils';

const extension: JupyterFrontEndPlugin<void> = {
  id: 'cluster',
  autoStart: true,
  optional: [ILauncher, IMainMenu],
  activate: async (
    app: JupyterFrontEnd,
    launcher: ILauncher,
    mainMenu: IMainMenu
  ) => {
    const { commands } = app;
    const iconCluster = new LabIcon({
      name: 'launcher:clusters-icon',
      svgstr: clusterIcon
    });
    const iconServerless = new LabIcon({
      name: 'launcher:serverless-icon',
      svgstr: serverlessIcon
    });

    const kernelSpecs = await KernelSpecAPI.getSpecs();
    const kernels = kernelSpecs.kernelspecs;

    const command = 'create-cluster-component';
    commands.addCommand(command, {
      caption: 'Create a new Cluster Component',
      label: 'Clusters',
      // @ts-ignore
      icon: args => (args['isPalette'] ? null : iconCluster),
      execute: () => {
        const content = new Cluster();
        const widget = new MainAreaWidget<Cluster>({ content });
        widget.title.label = 'Clusters';
        widget.title.icon = iconCluster;
        app.shell.add(widget, 'main');
      }
    });

    const commandNew = 'create-serverless-component';
    commands.addCommand(commandNew, {
      caption: 'Create a new Serverless Component',
      label: 'Serverless',
      // @ts-ignore
      icon: args => (args['isPalette'] ? null : iconServerless),
      execute: () => {
        const content = new Serverless();
        const widget = new MainAreaWidget<Serverless>({ content });
        widget.title.label = 'Serverless';
        widget.title.icon = iconServerless;
        app.shell.add(widget, 'main');
      }
    });

    commands.addCommand('initConfig', {
      label: 'Setup',
      caption: 'Setup',
      execute: () => {
        const content = new AuthLogin();
        const widget = new MainAreaWidget<AuthLogin>({ content });
        widget.title.label = 'Config Setup';
        widget.title.icon = iconCluster;
        app.shell.add(widget, 'main');
      }
    });

    const snippetMenu = new Menu({ commands });
    snippetMenu.title.label = 'Dataproc';
    snippetMenu.addItem({ command: 'initConfig' });
    mainMenu.addMenu(snippetMenu);

    if (launcher) {
      Object.values(kernels).forEach(kernelsData => {
        if (
          kernelsData?.resources.endpointParentResource &&
          kernelsData?.resources.endpointParentResource.includes('/sessions')
        ) {
          const commandNotebook = `notebook:create-${kernelsData?.display_name}`;
          commands.addCommand(commandNotebook, {
            caption: kernelsData?.display_name,
            label: kernelsData?.display_name,
            icon: iconDisplay(kernelsData),
            execute: async () => {
              const model = await app.commands.execute(
                'docmanager:new-untitled',
                {
                  type: 'notebook',
                  path: '',
                  kernel: { name: kernelsData?.name }
                }
              );
              await app.commands.execute('docmanager:open', {
                kernel: { name: kernelsData?.name },
                path: model.path,
                factory: 'notebook'
              });
            }
          });

          launcher.add({
            command: commandNotebook,
            category: 'Dataproc Serverless Notebooks',
            // category: kernelsData?.resources.endpointParentResource.includes(
            //   '/sessions'
            // )
            //   ? 'Dataproc Serverless Notebooks'
            //   : 'Dataproc Cluster Notebooks',
            //@ts-ignore
            metadata: kernelsData?.metadata,
            //@ts-ignore
            args: kernelsData?.argv
          });
        }
      });
      Object.values(kernels).forEach(kernelsData => {
        if (
          kernelsData?.resources.endpointParentResource &&
          !kernelsData?.resources.endpointParentResource.includes('/sessions')
        ) {
          const commandNotebook = `notebook:create-${kernelsData?.display_name}`;
          commands.addCommand(commandNotebook, {
            caption: kernelsData?.display_name,
            label: kernelsData?.display_name,
            icon: iconDisplay(kernelsData),
            execute: async () => {
              const model = await app.commands.execute(
                'docmanager:new-untitled',
                {
                  type: 'notebook',
                  path: '',
                  kernel: { name: kernelsData?.name }
                }
              );
              await app.commands.execute('docmanager:open', {
                kernel: { name: kernelsData?.name },
                path: model.path,
                factory: 'notebook'
              });
            }
          });

          launcher.add({
            command: commandNotebook,
            category: 'Dataproc Cluster Notebooks',
            // category: kernelsData?.resources.endpointParentResource.includes(
            //   '/sessions'
            // )
            //   ? 'Dataproc Serverless Notebooks'
            //   : 'Dataproc Cluster Notebooks',
            //@ts-ignore
            metadata: kernelsData?.metadata,
            //@ts-ignore
            args: kernelsData?.argv
          });
        }
      });

      // Object.values(kernels).forEach(kernelsData => {
      //   if (kernelsData?.resources.endpointParentResource) {
      //     const commandConsole = `console:create-${kernelsData?.display_name}`;
      //     commands.addCommand(commandConsole, {
      //       caption: kernelsData?.display_name,
      //       label: kernelsData?.display_name,
      //       icon: iconDisplay(kernelsData),
      //       execute: async () => {
      //         await app.commands.execute('console:create', {
      //           activate: true,
      //           kernel: { name: kernelsData?.name }
      //         });

      //         await app.commands.execute('console:open', {
      //           activate: true,
      //           kernel: { name: kernelsData?.name }
      //         });
      //       }
      //     });

      //     launcher.add({
      //       command: commandConsole,
      //       category: 'Dataproc Console',
      //       metadata: kernelsData?.metadata,
      //       args: kernelsData?.argv
      //     });
      //   }
      // });

      launcher.add({
        command,
        category: 'Dataproc Jobs and Sessions',
        rank: 1
      });
      launcher.add({
        command: commandNew,
        category: 'Dataproc Jobs and Sessions',
        rank: 2
      });
    }
  }
};

export default extension;
