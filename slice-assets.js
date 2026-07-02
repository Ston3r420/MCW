const fs = require('fs');
const path = require('path');
// To use this, you need to install sharp:
// npm install sharp

async function sliceImage() {
  try {
    const sharp = require('sharp');
    
    // CONFIGURATION
    // -----------------------------------------------------
    const INPUT_FILE = './spritesheet.png'; // Path to your spritesheet
    const OUTPUT_DIR = './frontend/public/assets'; // Where to save the pieces
    
    // Configure the grid of your spritesheet
    const SPRITE_WIDTH = 300;  // The width of each individual sliced image
    const SPRITE_HEIGHT = 300; // The height of each individual sliced image
    const COLUMNS = 5;         // Number of columns in your spritesheet
    const ROWS = 5;            // Number of rows in your spritesheet
    
    // Map rows to the prefixes expected by WrestlerPicker
    const ROW_PREFIXES = ['Marb', 'Hair', 'Eyes', 'Mouth', 'Hat'];
    // -----------------------------------------------------
    
    if (!fs.existsSync(INPUT_FILE)) {
      console.error(`❌ Cannot find input file: ${INPUT_FILE}`);
      console.log('Please place your image in the same directory and name it spritesheet.png, or update the INPUT_FILE path.');
      return;
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log(`Processing ${INPUT_FILE}...`);
    const image = sharp(INPUT_FILE);
    const metadata = await image.metadata();
    
    console.log(`Image size: ${metadata.width}x${metadata.height}`);

    for (let r = 0; r < ROWS; r++) {
      const prefix = ROW_PREFIXES[r];
      if (!prefix) continue;
      
      for (let c = 0; c < COLUMNS; c++) {
        // The WrestlerPicker uses 1-indexed filenames (e.g. Marb1.png, Marb2.png)
        const index = c + 1;
        
        // Skip hair 6 if the grid only goes up to 5, or handle it differently if needed
        if (prefix === 'Hair' && index > 6) continue;

        const left = c * SPRITE_WIDTH;
        const top = r * SPRITE_HEIGHT;

        // Make sure we don't extract out of bounds
        if (left + SPRITE_WIDTH > metadata.width || top + SPRITE_HEIGHT > metadata.height) {
          console.warn(`⚠️ Skipping ${prefix}${index}.png - out of bounds!`);
          continue;
        }

        const outputPath = path.join(OUTPUT_DIR, `${prefix}${index}.png`);

        await image
          .clone()
          .extract({ left, top, width: SPRITE_WIDTH, height: SPRITE_HEIGHT })
          .toFile(outputPath);

        console.log(`✅ Created ${prefix}${index}.png`);
      }
    }
    
    console.log(`\n🎉 All done! Assets saved to ${OUTPUT_DIR}`);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ The "sharp" package is not installed. Please run:');
      console.error('   npm install sharp');
    } else {
      console.error('❌ Error slicing image:', error);
    }
  }
}

sliceImage();
