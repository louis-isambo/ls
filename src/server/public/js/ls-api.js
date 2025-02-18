
if(window.LDA){

   const socket = io()
    let init = false

   socket.on("connect", function(){
    console.log("socket connected");
    
   })
   
   socket.on("page:init", function(data){
        if(!init){
            pageApi.invoke("add-pages", null, data)
            init = true
        }
   })

    pageApi.handle("page-init", function(ev, pageInfo, listener){
           socket.emit("page:get", pageInfo, function(result){
                listener(result)
                console.log(result);
           })
    })

    pageApi.handle("page-style:init", function(e, id,page, data){
           socket.emit("page-style:init", {id, page, data})
    })

    pageApi.handle("page-style:get", function(e, id, page, listener){
            socket.emit("page-style:get", {id, page}, function(result){ 
                listener(result)
            })
    })

    pageApi.handle("page-style:save", function(e, data){
            socket.emit("page-style:save", data)
    })

    pageApi.handle("page-element:selected", function(e, id, page){
       socket.emit("page-element:selected", {id, page})
            
    })

    pageApi.handle("page:show", function(e, pageInfo){
            socket.emit("page:show", pageInfo)
            
    })

    pageApi.handle("page-style:changed", function(e, style){
           socket.emit("page-style:changed", style)
            
    })
}