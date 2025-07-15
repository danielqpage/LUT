/**
 * Image Processing Module
 * Handles image loading, processing, and color patch extraction
 */

const imageProcessor = {
    /**
     * Load and process image file
     * @param {File} file - Image file
     * @param {string} previewId - Preview container ID
     * @param {string} imageType - Image type ('reference' or 'camera')
     * @returns {Promise<Object>} Image data object
     */
    loadImage: async (file, previewId, imageType) => {
        return new Promise((resolve, reject) => {
            // Validate file
            const validation = imageProcessor.validateImageFile(file);
            if (!validation.valid) {
                reject(new Error(validation.error));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        // Create canvas for processing
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        
                        // Update preview
                        imageProcessor.updatePreview(e.target.result, previewId, imageType);
                        
                        // Create image data object
                        const imageData = {
                            canvas: canvas,
                            ctx: ctx,
                            width: img.width,
                            height: img.height,
                            image: img,
                            element: img,
                            file: file,
                            size: file.size,
                            type: file.type,
                            name: file.name
                        };
                        
                        console.log(`Image loaded: ${img.width}×${img.height}, ${utils.formatFileSize(file.size)}`);
                        resolve(imageData);
                        
                    } catch (error) {
                        reject(new Error(`Error processing image: ${error.message}`));
                    }
                };
                
                img.onerror = () => {
                    reject(new Error('Failed to load image. The file may be corrupted.'));
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file.'));
            };
            
            reader.readAsDataURL(file);
        });
    },

    /**
     * Validate image file
     * @param {File} file - File to validate
     * @returns {Object} Validation result
     */
    validateImageFile: (file) => {
        if (!file) {
            return { valid: false, error: 'No file selected' };
        }
        
        if (file.size > CONFIG.FILES.maxSize) {
            return { valid: false, error: CONFIG.ERRORS.fileTooBig };
        }
        
        if (!CONFIG.FILES.allowedTypes.includes(file.type)) {
            return { valid: false, error: CONFIG.ERRORS.invalidFileType };
        }
        
        return { valid: true };
    },

    /**
     * Update image preview
     * @param {string} imageSrc - Image source URL
     * @param {string} previewId - Preview container ID
     * @param {string} imageType - Image type
     */
    updatePreview: (imageSrc, previewId, imageType) => {
        const preview = document.getElementById(previewId);
        if (!preview) return;
        
        preview.innerHTML = '';
        
        const previewImg = document.createElement('img');
        previewImg.src = imageSrc;
        previewImg.className = 'preview-image';
        previewImg.alt = `${imageType} image preview`;
        
        preview.appendChild(previewImg);
        
        // Mark upload box as having image
        const uploadBox = preview.closest('.upload-box');
        if (uploadBox) {
            uploadBox.classList.add('has-image');
        }
        
        // Show align button
        const alignBtn = document.getElementById(`${imageType}AlignBtn`);
        if (alignBtn) {
            alignBtn.style.display = 'inline-block';
        }
    },

    /**
     * Extract color patches from image using alignment data
     * @param {Object} imageData - Image data object
     * @param {Object} alignment - Alignment data with markers
     * @returns {Object} Extraction results
     */
    extractColorPatches: (imageData, alignment) => {
        console.log('Extracting color patches...');
        
        const { ctx, width, height } = imageData;
        const { rows, cols, sampleSize, subSampleGrid } = CONFIG.GRID;
        
        // Validate alignment
        const alignmentValidation = utils.validateAlignment(alignment);
        if (!alignmentValidation.isValid) {
            throw new Error(`Invalid alignment: ${alignmentValidation.errors.join(', ')}`);
        }
        
        const patches = [];
        const qualityScores = [];
        const skippedIndices = [];
        const patchLocations = [];
        
        // Create interpolation control points from alignment markers
        const controlPoints = alignment.markers.map(m => [m.imageX, m.imageY]);
        
        let totalIndex = 0;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (utils.isMarkerPosition(row, col)) {
                    skippedIndices.push(totalIndex);
                    totalIndex++;
                    continue;
                }
                
                // Use interpolation to find actual patch position
                const u = col / (cols - 1);
                const v = row / (rows - 1);
                const [centerX, centerY] = imageProcessor.interpolateGridPosition(u, v, controlPoints);
                
                // Extract color samples from patch
                const samples = imageProcessor.samplePatch(
                    ctx, centerX, centerY, sampleSize, subSampleGrid, width, height
                );
                
                // Calculate quality score (coefficient of variation)
                const cv = imageProcessor.calculatePatchCV(samples);
                qualityScores.push(cv);
                
                // Calculate robust color average
                const color = imageProcessor.robustColorAverage(samples);
                patches.push(color);
                
                // Store patch location for debugging
                patchLocations.push({
                    row, col, centerX, centerY,
                    samples: samples.length,
                    cv: cv
                });
                
                totalIndex++;
            }
        }
        
        console.log(`Extracted ${patches.length} color patches, skipped ${skippedIndices.length} markers`);
        
        return { 
            patches, 
            qualityScores, 
            skippedIndices,
            patchLocations,
            alignment: alignment
        };
    },

    /**
     * Interpolate grid position using alignment markers
     * @param {number} u - Normalized column position (0-1)
     * @param {number} v - Normalized row position (0-1)
     * @param {Array} controlPoints - Array of [x, y] control points
     * @returns {Array} Interpolated [x, y] position
     */
    interpolateGridPosition: (u, v, controlPoints) => {
        // Determine which quadrant we're in
        let p0, p1, p2, p3;
        let localU, localV;

        if (u <= 0.5 && v <= 0.5) {
            // Top-left quadrant
            localU = u * 2;
            localV = v * 2;
            p0 = controlPoints[0]; // Top-left
            p1 = controlPoints[1]; // Top-center
            p2 = controlPoints[3]; // Mid-left
            p3 = controlPoints[4]; // Mid-center
        } else if (u > 0.5 && v <= 0.5) {
            // Top-right quadrant
            localU = (u - 0.5) * 2;
            localV = v * 2;
            p0 = controlPoints[1]; // Top-center
            p1 = controlPoints[2]; // Top-right
            p2 = controlPoints[4]; // Mid-center
            p3 = controlPoints[5]; // Mid-right
        } else if (u <= 0.5 && v > 0.5) {
            // Bottom-left quadrant
            localU = u * 2;
            localV = (v - 0.5) * 2;
            p0 = controlPoints[3]; // Mid-left
            p1 = controlPoints[4]; // Mid-center
            p2 = controlPoints[6]; // Bot-left
            p3 = controlPoints[7]; // Bot-center
        } else {
            // Bottom-right quadrant
            localU = (u - 0.5) * 2;
            localV = (v - 0.5) * 2;
            p0 = controlPoints[4]; // Mid-center
            p1 = controlPoints[5]; // Mid-right
            p2 = controlPoints[7]; // Bot-center
            p3 = controlPoints[8]; // Bot-right
        }

        // Bilinear interpolation
        const x1 = p0[0] * (1 - localU) + p1[0] * localU;
        const y1 = p0[1] * (1 - localU) + p1[1] * localU;
        
        const x2 = p2[0] * (1 - localU) + p3[0] * localU;
        const y2 = p2[1] * (1 - localU) + p3[1] * localU;
        
        const finalX = x1 * (1 - localV) + x2 * localV;
        const finalY = y1 * (1 - localV) + y2 * localV;

        return [finalX, finalY];
    },

    /**
     * Sample color patch around center point
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @param {number} patchSize - Size of patch to sample
     * @param {number} gridSize - Sub-sampling grid size
     * @param {number} maxWidth - Maximum width boundary
     * @param {number} maxHeight - Maximum height boundary
     * @returns {Array} Array of color samples
     */
    samplePatch: (ctx, centerX, centerY, patchSize, gridSize, maxWidth, maxHeight) => {
        const samples = [];
        const subSize = Math.floor(patchSize / gridSize);
        const startOffset = Math.floor(patchSize / 2);
        
        for (let sy = 0; sy < gridSize; sy++) {
            for (let sx = 0; sx < gridSize; sx++) {
                const x = Math.max(0, Math.min(centerX - startOffset + (sx * subSize), maxWidth - subSize));
                const y = Math.max(0, Math.min(centerY - startOffset + (sy * subSize), maxHeight - subSize));
                
                try {
                    const imageData = ctx.getImageData(x, y, subSize, subSize);
                    const avgColor = imageProcessor.averagePixels(imageData.data);
                    samples.push(avgColor);
                } catch (e) {
                    console.warn(`Sampling error at (${x}, ${y}):`, e);
                    // Use a neutral gray as fallback
                    samples.push([0.5, 0.5, 0.5]);
                }
            }
        }
        
        return samples;
    },

    /**
     * Calculate average color from pixel data
     * @param {Uint8ClampedArray} pixelData - Raw pixel data (RGBA)
     * @returns {Array} Average color [r, g, b] in range 0-1
     */
    averagePixels: (pixelData) => {
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let i = 0; i < pixelData.length; i += 4) {
            // Skip transparent pixels
            if (pixelData[i + 3] > 0) {
                r += pixelData[i];
                g += pixelData[i + 1];
                b += pixelData[i + 2];
                count++;
            }
        }
        
        if (count === 0) {
            return [0.5, 0.5, 0.5]; // Fallback to neutral gray
        }
        
        return [
            r / count / 255,
            g / count / 255,
            b / count / 255
        ];
    },

    /**
     * Calculate robust color average using outlier rejection
     * @param {Array} samples - Array of color samples
     * @returns {Array} Robust average color [r, g, b]
     */
    robustColorAverage: (samples) => {
        if (samples.length === 0) {
            console.warn('No samples provided for color averaging');
            return [0.5, 0.5, 0.5];
        }
        
        if (samples.length === 1) {
            return [...samples[0]];
        }
        
        // Extract channels
        const channels = [
            samples.map(s => s[0]), // Red
            samples.map(s => s[1]), // Green
            samples.map(s => s[2])  // Blue
        ];
        
        // Calculate robust average for each channel
        const robustAvg = channels.map(channelValues => {
            const median = utils.calculateMedian(channelValues);
            const mad = utils.calculateMAD(channelValues, median);
            
            // Filter outliers using MAD-based threshold
            const threshold = CONFIG.QUALITY.outlierThreshold;
            const filtered = channelValues.filter(v => 
                mad === 0 || Math.abs(v - median) / (mad + 0.001) < threshold
            );
            
            // Use filtered values if we have enough, otherwise use all
            const valuesToAvg = filtered.length >= CONFIG.QUALITY.minSamples ? filtered : channelValues;
            const average = valuesToAvg.reduce((sum, v) => sum + v, 0) / valuesToAvg.length;
            
            return Math.max(0, Math.min(1, average)); // Clamp to valid range
        });
        
        return robustAvg;
    },

    /**
     * Calculate coefficient of variation for patch samples
     * @param {Array} samples - Array of color samples
     * @returns {number} Coefficient of variation (0-1+)
     */
    calculatePatchCV: (samples) => {
        if (samples.length === 0) return 1.0;
        if (samples.length === 1) return 0.0;
        
        // Calculate CV for each channel and return average
        const channelCVs = [0, 1, 2].map(channel => {
            const values = samples.map(s => s[channel]);
            return utils.calculateCV(values);
        });
        
        // Return average CV across channels
        const avgCV = channelCVs.reduce((sum, cv) => sum + cv, 0) / 3;
        return Math.max(0, avgCV); // Ensure non-negative
    },

    /**
     * Analyze image quality and properties
     * @param {Object} imageData - Image data object
     * @returns {Object} Image analysis results
     */
    analyzeImage: (imageData) => {
        const { ctx, width, height } = imageData;
        
        // Sample points across the image for analysis
        const samplePoints = 100;
        const samples = [];
        
        for (let i = 0; i < samplePoints; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            
            try {
                const pixelData = ctx.getImageData(x, y, 1, 1).data;
                const color = [
                    pixelData[0] / 255,
                    pixelData[1] / 255,
                    pixelData[2] / 255
                ];
                samples.push(color);
            } catch (e) {
                // Skip if sampling fails
                continue;
            }
        }
        
        // Calculate image statistics
        const luminances = samples.map(utils.getLuminance);
        const avgLuminance = luminances.reduce((sum, l) => sum + l, 0) / luminances.length;
        const minLuminance = Math.min(...luminances);
        const maxLuminance = Math.max(...luminances);
        const contrast = maxLuminance - minLuminance;
        
        // Calculate color distribution
        const colorChannels = [
            samples.map(s => s[0]), // Red
            samples.map(s => s[1]), // Green
            samples.map(s => s[2])  // Blue
        ];
        
        const channelStats = colorChannels.map(channel => ({
            mean: channel.reduce((sum, v) => sum + v, 0) / channel.length,
            std: utils.calculateStandardDeviation(channel),
            min: Math.min(...channel),
            max: Math.max(...channel)
        }));
        
        return {
            width,
            height,
            aspectRatio: width / height,
            pixelCount: width * height,
            fileSize: imageData.size,
            avgLuminance,
            minLuminance,
            maxLuminance,
            contrast,
            dynamicRange: contrast,
            channelStats,
            colorSpace: 'sRGB', // Assumed
            bitDepth: 8 // Assumed for web images
        };
    },

    /**
     * Create a thumbnail of the image
     * @param {Object} imageData - Image data object
     * @param {number} maxSize - Maximum thumbnail size
     * @returns {string} Thumbnail data URL
     */
    createThumbnail: (imageData, maxSize = 200) => {
        const { image, width, height } = imageData;
        
        // Calculate thumbnail dimensions
        const scale = Math.min(maxSize / width, maxSize / height);
        const thumbWidth = Math.floor(width * scale);
        const thumbHeight = Math.floor(height * scale);
        
        // Create thumbnail canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = thumbWidth;
        canvas.height = thumbHeight;
        
        // Draw scaled image
        ctx.drawImage(image, 0, 0, thumbWidth, thumbHeight);
        
        return canvas.toDataURL('image/jpeg', 0.8);
    },

    /**
     * Convert image to different format
     * @param {Object} imageData - Image data object
     * @param {string} format - Target format ('image/jpeg', 'image/png', etc.)
     * @param {number} quality - Quality for lossy formats (0-1)
     * @returns {Blob} Converted image blob
     */
    convertImageFormat: (imageData, format = 'image/jpeg', quality = 0.9) => {
        const { canvas } = imageData;
        
        return new Promise((resolve) => {
            canvas.toBlob(resolve, format, quality);
        });
    },

    /**
     * Resize image to specific dimensions
     * @param {Object} imageData - Image data object
     * @param {number} newWidth - Target width
     * @param {number} newHeight - Target height
     * @param {boolean} maintainAspectRatio - Whether to maintain aspect ratio
     * @returns {Object} Resized image data
     */
    resizeImage: (imageData, newWidth, newHeight, maintainAspectRatio = true) => {
        const { image, width, height } = imageData;
        
        let targetWidth = newWidth;
        let targetHeight = newHeight;
        
        if (maintainAspectRatio) {
            const scale = Math.min(newWidth / width, newHeight / height);
            targetWidth = Math.floor(width * scale);
            targetHeight = Math.floor(height * scale);
        }
        
        // Create new canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        // Draw resized image
        ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
        
        return {
            ...imageData,
            canvas,
            ctx,
            width: targetWidth,
            height: targetHeight
        };
    },

    /**
     * Apply basic image corrections
     * @param {Object} imageData - Image data object
     * @param {Object} corrections - Correction parameters
     * @returns {Object} Corrected image data
     */
    applyCorrections: (imageData, corrections = {}) => {
        const { ctx, width, height } = imageData;
        const {
            brightness = 0,    // -100 to 100
            contrast = 0,      // -100 to 100
            saturation = 0,    // -100 to 100
            gamma = 1.0        // 0.1 to 3.0
        } = corrections;
        
        // Get image data
        const imageDataObj = ctx.getImageData(0, 0, width, height);
        const data = imageDataObj.data;
        
        // Apply corrections
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i] / 255;
            let g = data[i + 1] / 255;
            let b = data[i + 2] / 255;
            
            // Gamma correction
            if (gamma !== 1.0) {
                r = Math.pow(r, gamma);
                g = Math.pow(g, gamma);
                b = Math.pow(b, gamma);
            }
            
            // Brightness
            if (brightness !== 0) {
                const brightnessFactor = brightness / 100;
                r += brightnessFactor;
                g += brightnessFactor;
                b += brightnessFactor;
            }
            
            // Contrast
            if (contrast !== 0) {
                const contrastFactor = (100 + contrast) / 100;
                r = ((r - 0.5) * contrastFactor) + 0.5;
                g = ((g - 0.5) * contrastFactor) + 0.5;
                b = ((b - 0.5) * contrastFactor) + 0.5;
            }
            
            // Saturation
            if (saturation !== 0) {
                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                const saturationFactor = (100 + saturation) / 100;
                r = luminance + (r - luminance) * saturationFactor;
                g = luminance + (g - luminance) * saturationFactor;
                b = luminance + (b - luminance) * saturationFactor;
            }
            
            // Clamp and convert back to 0-255 range
            data[i] = Math.max(0, Math.min(255, r * 255));
            data[i + 1] = Math.max(0, Math.min(255, g * 255));
            data[i + 2] = Math.max(0, Math.min(255, b * 255));
        }
        
        // Put corrected data back
        ctx.putImageData(imageDataObj, 0, 0);
        
        return imageData;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = imageProcessor;
}