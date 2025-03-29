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

    console.log(`Uploading image ${name || path.basename(imagePath)} to ImgBB...`);
    
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

    // Log the actual raw response to help debug URL issues
    console.log(`ImgBB raw response for ${name}: ${JSON.stringify(data)}`);
    
    // Get all possible URLs from response for logging
    console.log(`URL options from ImgBB response:`);
    console.log(`- url: ${data.data.url}`);
    console.log(`- display_url: ${data.data.display_url}`);
    if (data.data.image) console.log(`- image.url: ${data.data.image.url}`);
    if (data.data.thumb) console.log(`- thumb.url: ${data.data.thumb.url}`);

    // Return the simplest possible successful response
    return {
      success: true,
      // For now, we'll use display_url as the primary URL
      url: data.data.display_url
    };
  } catch (error) {
    console.error(`❌ Failed to upload image to ImgBB: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}
