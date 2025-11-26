/**
 * Resize an image file to a maximum width/height while maintaining aspect ratio
 * @param {File|Blob} file - The image file to resize
 * @param {number} maxWidth - Maximum width in pixels (default: 800)
 * @param {number} maxHeight - Maximum height in pixels (default: 800)
 * @param {number} quality - JPEG quality 0-1 (default: 0.8)
 * @returns {Promise<string>} - Base64 data URL of the resized image
 */
export async function resizeImage(file, maxWidth = 800, maxHeight = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    // If it's already a string (URL), return it as-is
    if (typeof file === 'string') {
      resolve(file);
      return;
    }

    // If no file provided, return empty string
    if (!file) {
      resolve('');
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Convert a File/Blob to a base64 data URL without resizing
 * @param {File|Blob} file - The file to convert
 * @returns {Promise<string>} - Base64 data URL
 */
export async function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    if (typeof file === 'string') {
      resolve(file);
      return;
    }

    if (!file) {
      resolve('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
