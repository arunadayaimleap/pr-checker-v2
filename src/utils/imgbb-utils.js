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

    // Verify file exists
    if (!(await fs.pathExists(imagePath))) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    const imageBuffer = await fs.readFile(imagePath);
    
    // Validate image content
    if (imageBuffer.length === 0) {
      throw new Error('Image file is empty');
    }
    
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: path.basename(imagePath),
      contentType: 'image/png'
    });
    
    if (name) {
      formData.append('name', name);
    }

    // Add expiration - we don't need these images forever
    formData.append('expiration', 2592000); // 30 days in seconds

    console.log(`🔄 Sending request to ImgBB API for image ${name || path.basename(imagePath)}...`);
    
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

    // Log the response for debugging
    console.log(`📊 ImgBB response data structure: ${Object.keys(data.data).join(', ')}`);
    
    // Ensure URLs start with http/https
    const ensureHttpUrl = (url) => {
      if (!url) return '';
      return url.startsWith('http') ? url : `https:${url.startsWith('//') ? url : `//${url}`}`;
    };

    return {
      success: true,
      url: ensureHttpUrl(data.data.url),
      displayUrl: ensureHttpUrl(data.data.display_url),
      deleteUrl: data.data.delete_url,
      thumbUrl: ensureHttpUrl(data.data.thumb?.url) || ensureHttpUrl(data.data.url),
      mediumUrl: ensureHttpUrl(data.data.medium?.url) || ensureHttpUrl(data.data.url),
      directUrl: ensureHttpUrl(data.data.image?.url) || ensureHttpUrl(data.data.url)
    };
  } catch (error) {
    console.error(`❌ Failed to upload image to ImgBB: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}
