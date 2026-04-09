/**
 * Compress image to reduce Base64 size while maintaining quality
 * Optimized for production: high quality + reasonable file size
 */
export async function compressImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 1000,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        
        // Apply smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG with quality setting
        const compressed = canvas.toDataURL("image/jpeg", quality);
        
        // Check final size (Firestore limit is ~1MB, we'll ensure < 900KB to be safe)
        const sizeInBytes = compressed.length * 0.75; // Rough estimate of actual byte size
        const sizeInMB = sizeInBytes / (1024 * 1024);
        const sizeInKB = sizeInBytes / 1024;
        
        console.log(
          `Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${sizeInKB.toFixed(0)}KB (${sizeInMB.toFixed(2)}MB)`
        );
        
        // Firestore document field limit is ~1MB, we use 900KB to be safe
        const maxSizeMB = 0.9;
        if (sizeInMB > maxSizeMB) {
          reject(
            new Error(
              `Compressed image too large (${sizeInMB.toFixed(2)}MB). Please use a smaller/lower resolution photo.`
            )
          );
        } else {
          resolve(compressed);
        }
      };
      
      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    
    reader.readAsDataURL(file);
  });
}
