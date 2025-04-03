const fs = require('fs');
const path = require('path');

// Paths
const metadataPath = path.join(__dirname, '../../img/ground_breaking/v2/metadata.json');
const processedFolder = path.join(__dirname, '../../img/ground_breaking/v2/processed');

async function convertToPercentages() {
    try {
        // Read the current metadata
        const data = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        
        // For each image entry
        for (const [filename, entry] of Object.entries(data)) {
            // Skip entries without points
            if (!entry.points || !entry.points.length) continue;
            
            // Get image dimensions (use a standard size if we can't get actual dimensions)
            const standardWidth = 800;
            const standardHeight = 800;
            
            // Convert points to percentages
            entry.points = entry.points.map(point => [
                point[0] / standardWidth, 
                point[1] / standardHeight
            ]);
            
            console.log(`Converted points for ${filename} to percentages`);
        }
        
        // Save the updated metadata
        fs.writeFileSync(metadataPath, JSON.stringify(data, null, 2));
        console.log(`Updated metadata saved to ${metadataPath}`);
        
    } catch (error) {
        console.error('Error converting points to percentages:', error);
    }
}

convertToPercentages();