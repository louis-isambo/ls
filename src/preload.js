const { ipcRenderer, contextBridge } = require("electron");
const fs = require("fs")

const conf = JSON.parse(fs.readFileSync("./config.json").toString())
const LS = conf.server.protocol+"://"+conf.server.host+":"+conf.server.port
console.log(LS);

contextBridge.exposeInMainWorld("LDA", {

    log: (data) => ipcRenderer.invoke('log', data),
    save: (data) => ipcRenderer.invoke("save", data),
    getData: (sms) => ipcRenderer.invoke("send-data", sms),
    quit: () => ipcRenderer.invoke("quit"),
    process: (callback) => ipcRenderer.invoke("process", callback), 
    isServer : (callback) => ipcRenderer.on("server-ready", callback),
    status: (data) => ipcRenderer.invoke("status", data), 
    update: (data) => ipcRenderer.invoke("update", data), 
    LSA  : LS+conf.server.LSA ,
    LS,
    LSS : LS +  conf.server.LSS,
    version : conf.version
    
})




