const electron = require('electron')
const fs = require('fs')
const app = electron.app
const BrowserWindow = electron.BrowserWindow

const URL = 'https://www.mailchimp.com'
const dimensions = { width: 2560, height: 1600 }

class NativeImageEncoder {
  constructor (nativeImage) {
    this.nativeImage = nativeImage
  }
  encode ({ format, quality = 100 }) {
    let buffer = Buffer.from([])
    if (Object.is(format, 'png')) {
      buffer = this.nativeImage.toPNG()
    } else {
      buffer = this.nativeImage.toJPEG(quality)
    }
    return buffer
  }
}

const takeScreenshot = (contents, { stylesPath, outputFile, dimensions }) => {
  const rect = Object.assign(dimensions, { x: 0, y: 0 })
  contents.capturePage(rect, (nativeImage) => {
    const buffer = new NativeImageEncoder(nativeImage).encode({ format: 'jpg' })
    fs.writeFile(`./screenshots/${outputFile}`, buffer)
    console.log('Wrote file, exiting')
    app.quit()
  })
}

app.on('ready', () => {
  const localScreen = electron.screen
  const display = localScreen.getPrimaryDisplay().workAreaSize
  // Create a new window. Don't show it though, we're only using it to create the screenshot
  const windowOptions = Object.assign(dimensions, {
    x: display.width,
    y: display.height,
    resizable: false,
    'skip-taskbar': true,
    show: false,
    'enable-larger-than-screen': true
  })
  let screenshotWindow = new BrowserWindow(windowOptions)
  // We wait for the window to finish loading
  const contents = screenshotWindow.webContents
  contents.on('did-finish-load', () => {
    takeScreenshot(contents, Object.assign({ dimensions }, {
      stylesPath: './styles.css',
      outputFile: `mailchimp-${dimensions.width}-${dimensions.height}.jpg`,
      outputFormat: 'png'
    }))
  })
  screenshotWindow.loadURL(URL)
})
// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
