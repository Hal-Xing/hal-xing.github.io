const fs = require('fs');
const path = require('path');
const sharp = require('sharp'); // You'll need to install this: npm install sharp

// Configuration
const sourceJsonPath = path.join(__dirname, '../../img/ground_breaking/v1/marked_points.json');
const outputJsonPath = path.join(__dirname, '../../img/ground_breaking/v1/marked_points_percentage.json');
const imageFolder = path.join(__dirname, '../../img/ground_breaking/v1/finished');
const backupPath = path.join(__dirname, '../../img/ground_breaking/v1/marked_points_backup.json');

// Create a backup of the original file
function backupOriginalFile() {
    if (fs.existsSync(sourceJsonPath)) {
        console.log('Creating backup of original coordinates file...');
        fs.copyFileSync(sourceJsonPath, backupPath);
        console.log(`Backup created at: ${backupPath}`);
    }
}

// Main conversion function
async function convertToPercentages() {
    try {
        // Back up the original file
        backupOriginalFile();
        
        // Read the original points file
        console.log('Reading original coordinate data...');
        const originalPoints = JSON.parse(fs.readFileSync(sourceJsonPath, 'utf8'));
        const percentagePoints = {};
        
        // Get all image files
        const imageFiles = fs.readdirSync(imageFolder)
            .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
        
        console.log(`Found ${imageFiles.length} image files to process`);
        console.log(`Found ${Object.keys(originalPoints).length} entries in the coordinate file`);
        
        // Track statistics
        let processed = 0;
        let skipped = 0;
        let errors = 0;
        
        // Process each image
        for (const [filename, points] of Object.entries(originalPoints)) {
            if (!points || !points.length) {
                console.warn(`Skipping ${filename}: No points found`);
                skipped++;
                continue;
            }
            
            const imagePath = path.join(imageFolder, filename);
            
            // Check if the image exists
            if (!fs.existsSync(imagePath)) {
                console.warn(`Skipping ${filename}: Image file not found`);
                skipped++;
                continue;
            }
            
            try {
                // Get image dimensions using sharp
                const metadata = await sharp(imagePath).metadata();
                const { width, height } = metadata;
                
                if (!width || !height) {
                    console.warn(`Skipping ${filename}: Could not determine image dimensions`);
                    skipped++;
                    continue;
                }
                
                // Convert each point to percentage (0-1 range)
                const convertedPoints = points.map(point => [
                    parseFloat((point[0] / width).toFixed(6)),  // x as percentage of width
                    parseFloat((point[1] / height).toFixed(6))  // y as percentage of height
                ]);
                
                percentagePoints[filename] = convertedPoints;
                processed++;
                
                // Log progress periodically
                if (processed % 10 === 0) {
                    console.log(`Processed ${processed} images...`);
                }
            } catch (err) {
                console.error(`Error processing ${filename}: ${err.message}`);
                // Add original points to avoid data loss
                percentagePoints[filename] = points;
                errors++;
            }
        }
        
        // Write the percentage-based coordinates
        fs.writeFileSync(outputJsonPath, JSON.stringify(percentagePoints, null, 2));
        
        console.log('\nConversion Summary:');
        console.log(`✓ Successfully processed: ${processed} images`);
        console.log(`⚠ Skipped: ${skipped} images`);
        console.log(`✗ Errors: ${errors} images`);
        console.log(`\nOutput saved to: ${outputJsonPath}`);
    } catch (err) {
        console.error(`Error converting coordinates: ${err.message}`);
    }
}

// Function to apply the conversion (replaces original file)
function applyConversion() {
    if (fs.existsSync(outputJsonPath)) {
        // Make another backup just to be safe
        backupOriginalFile();
        
        // Replace the original file with the percentage-based version
        fs.copyFileSync(outputJsonPath, sourceJsonPath);
        console.log(`\nSuccessfully replaced original file with percentage-based coordinates.`);
        console.log(`Your application will now use percentage-based coordinates.`);
    } else {
        console.error('Cannot apply conversion: Percentage file not found. Run conversion first.');
    }
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--apply')) {
        // Apply the conversion to the original file
        applyConversion();
    } else if (args.includes('--help')) {
        console.log('Usage:');
        console.log('  node convert_to_percentage.js         # Convert to percentages without replacing original');
        console.log('  node convert_to_percentage.js --apply # Convert and replace original file');
        console.log('  node convert_to_percentage.js --help  # Show this help message');
    } else {
        // Just run the conversion
        convertToPercentages();
    }
}

module.exports = { convertToPercentages, applyConversion };