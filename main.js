const electron = require('electron')
const fs = require('fs')
const Q = require('q')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const URL = 'https://www.mailchimp.com'
const dimensions = { width: 2560, height: 1600 }

// Should go into a separate module
const Pinky = {
  readFile: (path) => {
    return Q.promise((resolve, reject) => {
      fs.readFile(path, 'utf-8', (error, contents) => {
        if (error) {
          reject(error)
        } else {
          resolve(contents)
        }
      })
    })
  }
}

const waitFor = (timeout) => {
  return Q.promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, timeout)
  })
}

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
  console.log('Page has finished loading')
  Pinky.readFile(stylesPath).then(cssDeclarations => {
    console.log('CSS declarations', cssDeclarations)
    contents.insertCSS(cssDeclarations)
    // Take the screenshot and write it to a file
    const rect = Object.assign(dimensions, { x: 0, y: 0 })
    // Maybe the injected CSS needs time, the result is not accurate without it
    waitFor(3000).then(() => {
      contents.capturePage(rect, (nativeImage) => {
        // See above, the NativeImageEncoder#encode (format: [jpg|png], [quality: (0..100)]) => Buffer
        const buffer = new NativeImageEncoder(nativeImage).encode({format: 'jpg'})
        fs.writeFile(outputFile, buffer)
        console.log('Wrote file, exiting')
        app.quit()
      })
    })
    console.log('Waiting for the elements to be ready for the screenshot')
  }).catch(error => {
    console.log(error)
  })
}

app.on('ready', () => {
  // Create a new window. Don't show it though, we're only using it to create the screenshot
  const windowOptions = Object.assign(dimensions, { show: false })
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
