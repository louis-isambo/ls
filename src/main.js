
const { BrowserWindow, app, ipcMain } = require("electron");
const path = require("path");
const { fork } = require('child_process');
const actions = require("./action.js")
function setData(event, data) {

}




let isServer ;
function createServerProcess(pcPath){

    const serverProcess = fork(pcPath); 
    serverProcess.on('message', (message) => {
        console.log(`Message du serveur : ${message}`);
        message = JSON.parse(message)
        if(isServer && message.url){
            isServer(message.url)
        }
       
    });

    serverProcess.on('exit', (code) => {
        console.log(`Le serveur s'est arrêté avec le code ${code}`);
    });

    // Arrêter le serveur proprement
    process.on('SIGINT', () => {
        serverProcess.kill(); // Tue le processus enfant
        console.log('Serveur arrêté.');
        process.exit();
    });

}

createServerProcess("./src/server/server.js")

function sendData(event, data) {
    return
}

function getStatus(status){
    console.log(status);
    
}

function createWin() {
    const win = new BrowserWindow({
        width: 700,
        height: 650,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration : true
        },
        // frame: false,
        // center: true,
        // resizable: true,
        // roundedCorners: true,
        // transparent: true
    })

    win.webContents.openDevTools();
    return win
}


app.whenReady().then(() => {
    const MainWin = createWin()
    isServer = function(url){
        MainWin.loadURL(url)
    }
    ipcMain.handle("send-data", setData)
    ipcMain.handle("log", function (event, data) { process.stdout.write(data) })
    ipcMain.handle("API", sendData)
    ipcMain.handle("status", getStatus)
    ipcMain.handle("update", actions.updateApp)
    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) MainWin()
    })

    app.on("window-all-closed", function () {
        if (process.platform !== "darwin") app.quit()
    })
})