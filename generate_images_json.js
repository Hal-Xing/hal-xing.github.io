const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'img/receipts/ueno_geisai_rotated');
const outputPath = path.join(__dirname, 'images.json');

fs.readdir(directoryPath, (err, files) => {
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    }

    const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/.test(file));
    fs.writeFile(outputPath, JSON.stringify(images, null, 2), (err) => {
        if (err) {
            return console.log('Error writing file: ' + err);
        }
        console.log('images.json has been generated');
    });
});