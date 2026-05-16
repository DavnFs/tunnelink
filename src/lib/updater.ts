import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { ask, message } from '@tauri-apps/plugin-dialog';

export async function checkForUpdates(silent: boolean = false) {
  try {
    const update = await check();
    
    if (update) {
      console.log(`Update available: ${update.version}`);
      
      const shouldUpdate = await ask(
        `TunneLink v${update.version} is now available!\n\nRelease notes:\n${update.body || 'Bug fixes and improvements.'}\n\nWould you like to install it now?`,
        { title: 'Update Available', kind: 'info' }
      );

      if (shouldUpdate) {
        if (!silent) await message('Update is downloading. TunneLink will relaunch automatically when finished.', { title: 'Downloading Update' });
        
        let downloaded = 0;
        let contentLength = 0;
        
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              contentLength = event.data.contentLength || 0;
              console.log(`started downloading ${contentLength} bytes`);
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              console.log(`downloaded ${downloaded} from ${contentLength}`);
              break;
            case 'Finished':
              console.log('download finished');
              break;
          }
        });
        
        console.log('Update installed, relaunching...');
        await relaunch();
      }
    } else {
      if (!silent) {
        await message('You are already running the latest version of TunneLink.', { title: 'Up to Date', kind: 'info' });
      }
    }
  } catch (error) {
    console.error('Failed to check for updates:', error);
    if (!silent) {
      await message('An error occurred while checking for updates. Please try again later.', { title: 'Update Error', kind: 'error' });
    }
  }
}
