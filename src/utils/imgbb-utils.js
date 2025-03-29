import fs from 'fs-extra';
import fetch from 'node-fetch';
import FormData from 'form-data';
import path from 'path';

/**
 * Uploads an image to ImgBB and returns the URL
 * @param {string} imagePath - Path to the image file
 * @param {string} name - Name for the uploaded image
 * @returns {Promise<Object>} Upload result with URLs
 */
export async function uploadImageToImgBB(imagePath, name) {
  try {
    if (!process.env.IMGBB_API_KEY) {
      throw new Error('IMGBB_API_KEY environment variable is not set');
    }

    const imageBuffer = await fs.readFile(imagePath);
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: path.basename(imagePath),
      contentType: 'image/png'
    });
    
    if (name) {
      formData.append('name', name);
    }

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ImgBB API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`ImgBB upload failed: ${data.error?.message || 'Unknown error'}`);
    }

    return {
      success: true,
      url: data.data.url,
      displayUrl: data.data.display_url,
      deleteUrl: data.data.delete_url
    };
  } catch (error) {
    console.error(`❌ Failed to upload image to ImgBB: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}
