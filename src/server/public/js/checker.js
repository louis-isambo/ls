window.addEventListener("online", function(ev){
    this.window.LDA.status("online")
    this.fetch("https://louis-isambo.github.io/ls/version.txt").then(async function(data){
        let version =  await (await data.text())
        version = version.trim()
        console.log(version);
        
        if(version !== window.LDA.version){
            window.LDA.update(version)
        }
    })
})


window.addEventListener("offline", function(ev){

    this.window.LDA.status("offline")

})


