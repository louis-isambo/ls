import http  from "http"
import express  from "express"
import {Server} from "socket.io"
import  path  from"path"
import fs from "fs"
import {has} from "../utility/index.js"


const app = express()
const server =  http.createServer(app)
const io = new Server(server)


const pt = "/src/server"
app.use(express.json())

app.use("/",  express.static(path.join(process.cwd(), pt+"/public")))



app.get("/", function(req, res){
    res.sendFile(path.join(path.join(process.cwd(), pt+"/views/index.html")))
})

app.get("/temp/:temId", function(req, res){
    console.log(req.params.temId);
    res.sendFile(path.join(path.join(process.cwd(), pt+"/views/editor.html")))
})



const PROJECT = {}

io.on("connect", function(socket){

    socket.on("file:init", function(listener){
       let file =  fs.readFileSync("./design.json").toString()    
       listener(JSON.parse(file))
    })

    socket.on("file:save-content", function(data){
        fs.writeFileSync("./design.json", data)
    
    })
    
    // files APIS

    // init pages 
    socket.emit("page:init", [{name: "Index"}, {name: "login"}, {name: "404"},])

    // get page
    socket.on("page:get", function(pageInfo, listener){
        listener("received !")
        
    })

    // init page element style
    socket.on("page-style:init", function(option){
        if ( !has(option.page, PROJECT)){
            PROJECT[option.page] = {initStyle : {}}
        }
        
        PROJECT[option.page].initStyle[option.id] = option.data
    })

    //get page style
    socket.on("page-style:get", function(option, listener){
        listener(PROJECT[option.page].initStyle[option.id])
    })

    // save page element style
    socket.on("page-style:save", function(option){
        PROJECT[option.pageName].initStyle[option.id] = option.style
    })
    
    // get element selected
    socket.on("page-element:selected", function(option){
        console.log("select elem :" , option);
        
    })

    // get current page
    socket.on("page:show", function(option){
        console.log("current page", option);
        
    })

    // handle style changes
    socket.on("page-style:changed", function(option){
        console.log("style changed from ", option);
        
    })

    // get new version of app

    socket.on("update", function(data){
        console.log(data);
        
    })
})
const port = 5555
server.listen(port, function(){
    console.log(`server starting.....`);
    process.send(JSON.stringify({
        url : `http://localhost:${port}`
    }))
})




