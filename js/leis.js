

if(window.LDA){
    

    window.LDA.isServer(function(){
        console.log("server running....");
        pageApi.invoke("fls:add", null, window.LDA.LSS)
        setTimeout(function(){
            pageApi.invoke("fls:add", null, window.LDA.LSA)
        }, 1000)
    })
}
