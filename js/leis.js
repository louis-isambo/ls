

if(window.LDA){
    pageApi.invoke("fls:add", null, window.LDA.LSS)
    pageApi.invoke("fls:add", null, window.LDA.LSA)

    window.LDA.isServer(function(){
        console.log("server running....");
        
    })
}
