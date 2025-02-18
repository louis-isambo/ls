
const fs = require('fs');
const unzipper = require('unzipper');
const axios = require('axios');
const archiver = require('archiver');
const tar = require('tar');

function unzipFile(zipPath, outputPath, onSuccess, onError) {
    fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: outputPath }))
        .on('close', onSuccess)
        .on('error', onError);
}


function deleteFolder(folderPath, onSuccess, onError) {
    fs.rm(folderPath, { recursive: true, force: true }, (err) => {
        if (err) {
            onError(err)
            return 
        }
        onSuccess()
    });
}


async function downloadFile(url, outputPath, onSuccess, onError) {
    try {
        const response = await axios({
            method: 'GET',
            url,
            responseType: 'stream'
        });

        const file = fs.createWriteStream(outputPath);
        response.data.pipe(file);

        file.on('finish', () => {
            onSuccess()
        });

    } catch (error) {
       onError(error)
    }
}




function zipFolder(folderPath, outputPath, onSuccess, onError) {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } }); 

    output.on('close', () => {
        onSuccess()
    });

    archive.on('error', (err) => {
       onError(err)
    });

    archive.pipe(output);
    archive.directory(folderPath, false); 
    archive.finalize(); 
}




function tarFolder(folderPath, outputPath, onSuccess, onError) {
    tar.c(
        { gzip: true, file: outputPath },
        [folderPath]
    ).then(() => onSuccess())
     .catch(err => onError(err));
}




function deleteFile(filePath, onSuccess, onError) {
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return onError(err)
        }

        fs.unlink(filePath, (err) => {
            if (err) return onError(err)
            onSuccess()
        });
    });
}



function moveFile(source, destination) {
    fs.rename(source, destination, (err) => {
        if (err) {
            console.error(`Erreur lors du déplacement : ${err.message}`);
        } else {
            console.log(`✅ Fichier déplacé vers : ${destination}`);
        }
    });
}



function updateSrc(fileNames, destination){
    fileNames.forEach(file => {
        deleteFile(file, function(){
            moveFile(destination+file)
        }, function(){})
    });
}

const fileNames_ = [
    "./src/main.js",
    "./src/config.json",
    "./src/action.js",
    "./src/preload.js"
]
function updateApp(version){
    downloadFile(`https://louis-isambo.github.io/ls/src.${version}.zip`, "./src.zip", function(){
        deleteFolder("./src", function(){
            unzipFile("./src.zip", function(){ 
                updateSrc(fileNames_, "./")
                console.log("update is done !");
                
            }, function(){})
        }, function(){})
    })


}

module.exports = {
    unzipFile,
    deleteFolder,
    downloadFile,
    zipFolder,
    tarFolder,
    deleteFile,
    updateApp

}