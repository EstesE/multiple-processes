const async = require('async');
const config = require('config');
const ora = require('ora');
const { log } = console;

var finishedProcessing = (newFiles) => {
    log('\nFinished!');
    process.exit(1);
};

var removeGeneratedImages = (newFiles, finishedProcessing) => {
    // NOT FINISHED
    debugger;
    
    let counter = newFiles.length;

    newFiles.forEach(file => {
        const config = require('config');
        let sizes = config.sizes;
        for (let i = 0; i < sizes.length; i++) {
            sizes[i].file = file;
        }

        sizes.forEach(size => {
            const fs = require('fs-extra');
            debugger;

            if (size.file.indexOf(size.suffix) > -1) {
                fs.remove(size.file, err => {
                    if (err) { debugger; }
                    debugger;
                });
            }
        });

        // if (counter === 0) {
        //     finishedProcessing(newFiles);
        // }
    });
};

var processImages = (images, removeGeneratedImages, finishedProcessing) => {
    let spinner = ora('Processing Images').start();
    let newFiles = [];

    var q = async.queue((task, callback) => {
        const exec = require('child_process').exec;
        const path = require('path');
        const config = require('config');

        let percentage = config.percentage;
        let fileName = path.basename(task);
        let fileNameBase = fileName.replace(path.extname(task), '');
        let directoryName = path.dirname(task);
        let extension = path.extname(task);
        let newName = path.dirname(task).replace(path.basename(config.srcDirectory), path.basename(config.dstDirectory)) + '/' + fileName;    

        let command = config.guetzliPath + ' --nomemlimit --quality ' + percentage + ' "' + task + '" "' + newName + '"';
        spinner.text = 'Processing Images (' + newName + ')';
        exec(command, (err, stdout, stderr) => {
            if (err) {
                debugger;
            }
            newFiles.push(newName);
            callback();
        });
    }, config.concurrency);

    q.drain = () => {
        spinner.text = 'Processing Images';
        spinner.succeed();
        // removeGeneratedImages(newFiles, finishedProcessing);
        removeGeneratedImages(images, finishedProcessing);
    };

    images.forEach(image => {
        q.push(image);
    });
};

var updateFiles = (images, processImages, removeGeneratedImages, finishedProcessing) => {
    let spinner = ora('Updating file list').start();
    const recursive = require('recursive-readdir');
    let srcDirectory = config.srcDirectory;
    
    recursive(srcDirectory, (err, files) => {
        const isUnixHiddenPath = require('./modules/extras').isUnixHiddenPath;
        if (err) { debugger; }

        for(let i = 0; i < files.length; i++) {
            if (isUnixHiddenPath(files[i])) {
                let index = files.indexOf(files[0]);
                if (index > -1) {
                    files.splice(index, 1);
                }
            }
            if (i === files.length - 1) {
                spinner.succeed();
                processImages(files, processImages, removeGeneratedImages, finishedProcessing);
            }
        }
    });
};

var generateSizes = (files, updateFiles, processImages, removeGeneratedImages, finishedProcessing) => {
    let spinner = ora('Generating sizes based off of config settings').start();
    const config = require('config');
    const sizes = config.sizes;

    let filesLength = files.length;
    let sizesLength = sizes.length;
    let counter = filesLength * sizesLength;

    files.forEach(file => {
        let sizes = config.sizes;
        for (let i = 0; i < sizes.length; i++) {
            sizes[i].file = file;
        }

        sizes.forEach(size => {
            const isUnixHiddenPath = require('./modules/extras').isUnixHiddenPath;
            if (!isUnixHiddenPath(size.file)) {
                const exec = require('child_process').exec;
                const path = require('path');
                let pathName = path.dirname(size.file);
                let fileExt = path.extname(size.file);
                let name = path.basename(size.file);
                let newFile = pathName + '/' + name.replace(fileExt, '') + size.suffix + fileExt;
                let command = 'gm convert -size ' + size.width + 'x' + size.height + ' ' + size.file + ' -resize ' + size.width + 'x' + size.height + ' +profile "*" ' + newFile;
                exec(command, (err, stdout, stderr) => {
                    if (err) {
                        debugger;
                    }
                    counter--;
                    if (counter === 0) {
                        spinner.succeed();
                        updateFiles(files, processImages, removeGeneratedImages, finishedProcessing);
                    }
                });
            } else {
                counter--;
            }
        });
    });
    
};

var buildDirectoryStructure = (files, generateSizes, updateFiles, processImages, removeGeneratedImages, finishedProcessing) => {
    let spinner = ora('Building directory structure').start();
    let counter = 0;
    files.forEach(file => {
        const path = require('path');
        const config = require('config');
        const fs = require('fs-extra');

        let destination = path.dirname(file).replace(path.basename(config.srcDirectory), path.basename(config.dstDirectory));
        fs.ensureDir(destination, err => {
            if (err) { debugger; }
            counter++;
            if (counter === files.length) {
                spinner.succeed();
                generateSizes(files, updateFiles, processImages, removeGeneratedImages, finishedProcessing);
            }
        });
    });
};

var getFiles = (buildDirectoryStructure, generateSizes, updateFiles, processImages, removeGeneratedImages, finishedProcessing) => {
    log('');
    const recursive = require('recursive-readdir');
    let spinner = ora('Getting list of files').start();
    let srcDirectory = config.srcDirectory;
    
    recursive(srcDirectory, (err, files) => {
        const isUnixHiddenPath = require('./modules/extras').isUnixHiddenPath;
        if (err) { debugger; }
        spinner.succeed();

        for(let i = 0; i < files.length; i++) {
            if (isUnixHiddenPath(files[i])) {
                let index = files.indexOf(files[0]);
                if (index > -1) {
                    files.splice(index, 1);
                }
            }
        }
        buildDirectoryStructure(files, generateSizes, updateFiles, processImages, removeGeneratedImages, finishedProcessing);
    });
};

// TODO:
// Upload files to azure before 'removeGeneratedImages'
getFiles(buildDirectoryStructure, generateSizes, updateFiles, processImages, removeGeneratedImages, finishedProcessing);