const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'images');
const outputPath = path.join(__dirname, 'images.json');

// Extensions supportées
const supportedExtensions = /\.(jpe?g|png|gif|webp|heic|mp4|mov|webm)$/i;

const result = {};

fs.readdirSync(baseDir, { withFileTypes: true }).forEach(dirent => {
    if (dirent.isDirectory()) {
        const folderName = dirent.name;
        const folderPath = path.join(baseDir, folderName);
        const files = fs.readdirSync(folderPath)
            .filter(f => supportedExtensions.test(f));
        result[folderName] = files;
    }
});

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`✅ js/images.json généré avec ${Object.keys(result).length} projets.`);
