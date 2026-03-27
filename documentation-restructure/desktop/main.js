import { BrowserWindow, app as electronApp, dialog } from "electron";
import { createApp } from "../src/app.js";

let backendServer = null;
let backendPort = null;
let mainWindow = null;
let isQuitting = false;

async function startBackendServer() {
  const expressApp = createApp();

  return new Promise((resolve, reject) => {
    const server = expressApp.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to allocate desktop backend port."));
        return;
      }

      resolve({
        server,
        port: address.port
      });
    });

    server.on("error", reject);
  });
}

function createMainWindow() {
  if (!backendPort) {
    throw new Error("Desktop backend is not available.");
  }

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadURL(`http://127.0.0.1:${backendPort}`);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function stopBackendServer() {
  if (!backendServer) {
    return;
  }

  await new Promise((resolve) => {
    backendServer.close(() => resolve());
  });

  backendServer = null;
  backendPort = null;
}

async function bootstrapDesktopApp() {
  const backend = await startBackendServer();
  backendServer = backend.server;
  backendPort = backend.port;
  createMainWindow();
}

electronApp.whenReady().then(async () => {
  try {
    await bootstrapDesktopApp();
  } catch (error) {
    dialog.showErrorBox("Desktop Startup Failed", error.message);
    await stopBackendServer();
    electronApp.quit();
  }
});

electronApp.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && backendPort) {
    createMainWindow();
  }
});

electronApp.on("window-all-closed", async () => {
  if (process.platform !== "darwin") {
    isQuitting = true;
    await stopBackendServer();
    electronApp.quit();
  }
});

electronApp.on("before-quit", async (event) => {
  if (isQuitting || !backendServer) {
    return;
  }

  event.preventDefault();
  isQuitting = true;
  await stopBackendServer();
  electronApp.quit();
});
