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

    // Log the complete response data for debugging
    console.log(`ImgBB complete response for ${name}:`, JSON.stringify(data.data, null, 2));
    
    // Check if we have a valid direct image URL - that's the one we want to use
    let imageUrl = '';
    
    // Try different fields that might contain the direct URL
    if (data.data.image && data.data.image.url) {
      imageUrl = data.data.image.url;
      console.log(`Using image.url: ${imageUrl}`);
    } else if (data.data.thumb && data.data.thumb.url) {
      imageUrl = data.data.thumb.url;
      console.log(`Using thumb.url: ${imageUrl}`);
    } else if (data.data.url) {
      imageUrl = data.data.url;
      console.log(`Using data.url: ${imageUrl}`);
    } else if (data.data.display_url) {
      imageUrl = data.data.display_url;
      console.log(`Using display_url: ${imageUrl}`);
    }
    
    return {
      success: true,
      url: imageUrl || data.data.url,
      displayUrl: data.data.display_url,
      deleteUrl: data.data.delete_url,
      rawResponse: data.data // Include the raw response for debugging
    };
  } catch (error) {
    console.error(`❌ Failed to upload image to ImgBB: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}
