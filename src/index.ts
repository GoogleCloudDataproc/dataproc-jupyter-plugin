import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  JupyterLab,
  ILabShell
} from '@jupyterlab/application';
import { MainAreaWidget } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { LabIcon } from '@jupyterlab/ui-components';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { Cluster } from './cluster/cluster';
import { Serverless } from './batches/batches';
import clusterIcon from '../style/icons/cluster_icon.svg';
import serverlessIcon from '../style/icons/serverless_icon.svg';
import { Menu, Panel, Title, Widget } from '@lumino/widgets';
import { AuthLogin } from './login/authLogin';
import { Kernel, KernelSpecAPI } from '@jupyterlab/services';
import { iconDisplay } from './utils/utils';
import { dpmsWidget } from './dpms/dpmsWidget';
import dpmsIcon from '../style/icons/dpms_icon.svg';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
const iconDpms = new LabIcon({
  name: 'launcher:dpms-icon',
  svgstr: dpmsIcon
});

const extension: JupyterFrontEndPlugin<void> = {
  id: 'cluster',
  autoStart: true,
  optional: [ILauncher, IMainMenu, ILabShell, INotebookTracker],
  activate: async (
    app: JupyterFrontEnd,
    launcher: ILauncher,
    mainMenu: IMainMenu,
    labShell: ILabShell,
    notebookTracker: INotebookTracker
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
    //  const onTitleChanged = async (title: Title<Widget>) => {
    //     const widget = title.owner as NotebookPanel;
    //     if (widget && widget instanceof NotebookPanel) {
    //       console.log("enteres if");
    //       const kernel = widget.sessionContext.session?.kernel;
    //       // let kernelName = await getActiveNotebookKernelName(widget);
    //       let kernelName = kernel?.name;
    //       console.log(kernelName,"kernelname");
    //       if (kernelName) {
    //         console.log("executing");
    //         console.log(kernels[kernelName]);
    //         const kernelSpec = kernels[kernelName];
    //         console.log(kernelSpec?.resources.endpointParentResource || null);
    //         document.title = `${title.label}`;
    //       }
    //       console.log(document.title);
    //     } else {
    //       document.title = title.label;
    //     }
    //     console.log(Kernel)
    //   };
    const onTitleChanged = async (title: Title<Widget>) => {
      const widget = title.owner as NotebookPanel;
      if (widget && widget instanceof NotebookPanel) {
        const kernel = widget.sessionContext.session?.kernel;
        if (kernel) {
          const kernelName = kernel.name;
          const kernelSpec = kernels[kernelName];
          if (
            kernelSpec?.resources.endpointParentResource.includes('/clusters/')
          ) {
            const parts =
              kernelSpec?.resources.endpointParentResource.split('/');
            const clusterValue = parts[parts.length - 1];
            console.log(clusterValue);
            localStorage.setItem('clusterValue', clusterValue);
          }
        } else {
          console.log('No active kernel.');
        }
        document.title = title.label;
        console.log(document.title);
      } else {
        document.title = title.label;
      }
      console.log(Kernel);
    };
    labShell.currentChanged.connect((_, change) => {
      const { oldValue, newValue } = change;

      // Clean up after the old value if it exists,
      // listen for changes to the title of the activity
      if (oldValue) {
        // Check if the old value is an instance of NotebookPanel
        if (oldValue instanceof NotebookPanel) {
          oldValue.title.changed.disconnect(onTitleChanged);
        }
      }

      if (newValue) {
        // Check if the new value is an instance of NotebookPanel
        if (newValue instanceof NotebookPanel) {
          newValue.title.changed.connect(onTitleChanged);
        }
      }
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
            // console.log(Kernel);
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
      const panel = new Panel();
      panel.id = 'dpms-tab';
      panel.title.icon = iconDpms; // svg import
      panel.addWidget(new dpmsWidget(app as JupyterLab));
      app.shell.add(panel, 'left');

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

// function getActiveNotebookKernelName(notebookTracker: INotebookTracker): string | null {
//   const currentWidget = notebookTracker.currentWidget;
//   if (currentWidget instanceof NotebookPanel) {
//     const kernel = currentWidget.sessionContext.session?.kernel;
//     return kernel?.name ?? null;
//   }
//   return null;
// }
export default extension;
