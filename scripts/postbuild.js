import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Running post-build script...');

// Define paths
const publicDir = path.resolve(__dirname, '../public');
const distDir = path.resolve(__dirname, '../dist');

// List of critical files to ensure they're in the build
const criticalFiles = ['_redirects', '.htaccess'];

// Copy each critical file
criticalFiles.forEach(file => {
  const srcPath = path.join(publicDir, file);
  const destPath = path.join(distDir, file);
  
  if (fs.existsSync(srcPath)) {
    try {
      // Make sure the destination directory exists
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }
      
      // Copy the file
      fs.copyFileSync(srcPath, destPath);
      
      // Set file permissions to be readable and writable by owner, readable by others
      fs.chmodSync(destPath, 0o644);
      
      console.log(`✅ Successfully copied ${file} to build directory`);
    } catch (error) {
      console.error(`❌ Error copying ${file}:`, error);
    }
  } else {
    console.warn(`⚠️ Warning: ${file} not found in public directory`);
  }
});

console.log('Post-build script completed!');
