/**
 * Utility Functions
 * Common utility functions used throughout the application
 */

const utils = {
    /**
     * Check if a grid position corresponds to a marker position
     * @param {number} row - Grid row (0-6)
     * @param {number} col - Grid column (0-14)
     * @returns {boolean} True if position is a marker
     */
    isMarkerPosition: (row, col) => {
        const markerPositions = [
            [0, 0], [0, 7], [0, 14],    // Top row
            [3, 0], [3, 7], [3, 14],    // Middle row
            [6, 0], [6, 7], [6, 14]     // Bottom row
        ];
        return markerPositions.some(pos => pos[0] === row && pos[1] === col);
    },

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value (default: 0)
     * @param {number} max - Maximum value (default: 1)
     * @returns {number} Clamped value
     */
    clamp: (value, min = 0, max = 1) => {
        return Math.max(min, Math.min(max, value));
    },

    /**
     * Calculate Euclidean distance between two RGB colors
     * @param {Array} c1 - First color [r, g, b]
     * @param {Array} c2 - Second color [r, g, b]
     * @returns {number} Color distance
     */
    colorDistance: (c1, c2) => {
        const dr = c1[0] - c2[0];
        const dg = c1[1] - c2[1];
        const db = c1[2] - c2[2];
        return Math.sqrt(dr * dr + dg * dg + db * db);
    },

    /**
     * Calculate delta E color difference (CIE76)
     * @param {Array} lab1 - First Lab color [L, a, b]
     * @param {Array} lab2 - Second Lab color [L, a, b]
     * @returns {number} Delta E value
     */
    deltaE: (lab1, lab2) => {
        const dL = lab1[0] - lab2[0];
        const da = lab1[1] - lab2[1];
        const db = lab1[2] - lab2[2];
        return Math.sqrt(dL * dL + da * da + db * db);
    },

    /**
     * Calculate median of an array of numbers
     * @param {Array} values - Array of numbers
     * @returns {number} Median value
     */
    calculateMedian: (values) => {
        if (values.length === 0) return 0;
        
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        
        return sorted.length % 2 ? 
            sorted[mid] : 
            (sorted[mid - 1] + sorted[mid]) / 2;
    },

    /**
     * Calculate Median Absolute Deviation (MAD)
     * @param {Array} values - Array of numbers
     * @param {number} median - Median value (optional, will calculate if not provided)
     * @returns {number} MAD value
     */
    calculateMAD: (values, median = null) => {
        if (values.length === 0) return 0;
        
        if (median === null) {
            median = utils.calculateMedian(values);
        }
        
        const deviations = values.map(v => Math.abs(v - median));
        return utils.calculateMedian(deviations);
    },

    /**
     * Calculate standard deviation
     * @param {Array} values - Array of numbers
     * @returns {number} Standard deviation
     */
    calculateStandardDeviation: (values) => {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        
        return Math.sqrt(variance);
    },

    /**
     * Calculate coefficient of variation
     * @param {Array} values - Array of numbers
     * @returns {number} Coefficient of variation (std dev / mean)
     */
    calculateCV: (values) => {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        if (mean === 0) return 0;
        
        const std = utils.calculateStandardDeviation(values);
        return std / mean;
    },

    /**
     * Calculate luminance (perceived brightness) from RGB
     * @param {Array} color - RGB color [r, g, b] in range 0-1
     * @returns {number} Luminance value
     */
    getLuminance: (color) => {
        return 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2];
    },

    /**
     * Convert RGB to HSV color space
     * @param {Array} rgb - RGB color [r, g, b] in range 0-1
     * @returns {Array} HSV color [h, s, v]
     */
    rgbToHsv: (rgb) => {
        const [r, g, b] = rgb;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        let h = 0;
        if (diff !== 0) {
            if (max === r) {
                h = (60 * ((g - b) / diff) + 360) % 360;
            } else if (max === g) {
                h = (60 * ((b - r) / diff) + 120) % 360;
            } else {
                h = (60 * ((r - g) / diff) + 240) % 360;
            }
        }
        
        const s = max === 0 ? 0 : diff / max;
        const v = max;
        
        return [h, s, v];
    },

    /**
     * Convert HSV to RGB color space
     * @param {Array} hsv - HSV color [h, s, v]
     * @returns {Array} RGB color [r, g, b] in range 0-1
     */
    hsvToRgb: (hsv) => {
        const [h, s, v] = hsv;
        const c = v * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = v - c;
        
        let r, g, b;
        
        if (h >= 0 && h < 60) {
            [r, g, b] = [c, x, 0];
        } else if (h >= 60 && h < 120) {
            [r, g, b] = [x, c, 0];
        } else if (h >= 120 && h < 180) {
            [r, g, b] = [0, c, x];
        } else if (h >= 180 && h < 240) {
            [r, g, b] = [0, x, c];
        } else if (h >= 240 && h < 300) {
            [r, g, b] = [x, 0, c];
        } else {
            [r, g, b] = [c, 0, x];
        }
        
        return [r + m, g + m, b + m];
    },

    /**
     * Format number with specified decimal places
     * @param {number} num - Number to format
     * @param {number} decimals - Number of decimal places (default: 2)
     * @returns {string} Formatted number string
     */
    formatNumber: (num, decimals = 2) => {
        return Number(num).toFixed(decimals);
    },

    /**
     * Format percentage
     * @param {number} value - Value to format as percentage (0-1 range)
     * @param {number} decimals - Number of decimal places (default: 1)
     * @returns {string} Formatted percentage string
     */
    formatPercentage: (value, decimals = 1) => {
        return (value * 100).toFixed(decimals) + '%';
    },

    /**
     * Format file size in human-readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize: (bytes) => {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    },

    /**
     * Format duration in human-readable format
     * @param {number} milliseconds - Duration in milliseconds
     * @returns {string} Formatted duration
     */
    formatDuration: (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    },

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    debounce: (func, delay) => {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },

    /**
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Throttled function
     */
    throttle: (func, delay) => {
        let lastCall = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                func.apply(this, args);
            }
        };
    },

    /**
     * Deep clone an object
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    deepClone: (obj) => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => utils.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = utils.deepClone(obj[key]);
                }
            }
            return cloned;
        }
    },

    /**
     * Generate a UUID v4
     * @returns {string} UUID string
     */
    generateUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Check if a value is a valid number
     * @param {*} value - Value to check
     * @returns {boolean} True if valid number
     */
    isValidNumber: (value) => {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    },

    /**
     * Check if a value is a valid color array
     * @param {*} color - Color to validate
     * @returns {boolean} True if valid color
     */
    isValidColor: (color) => {
        return Array.isArray(color) && 
               color.length === 3 && 
               color.every(c => utils.isValidNumber(c) && c >= 0 && c <= 1);
    },

    /**
     * Interpolate between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    lerp: (a, b, t) => {
        return a + (b - a) * utils.clamp(t, 0, 1);
    },

    /**
     * Interpolate between two colors
     * @param {Array} color1 - Start color [r, g, b]
     * @param {Array} color2 - End color [r, g, b]
     * @param {number} t - Interpolation factor (0-1)
     * @returns {Array} Interpolated color
     */
    lerpColor: (color1, color2, t) => {
        return [
            utils.lerp(color1[0], color2[0], t),
            utils.lerp(color1[1], color2[1], t),
            utils.lerp(color1[2], color2[2], t)
        ];
    },

    /**
     * Calculate distance between two points
     * @param {Array} p1 - First point [x, y]
     * @param {Array} p2 - Second point [x, y]
     * @returns {number} Distance
     */
    pointDistance: (p1, p2) => {
        const dx = p1[0] - p2[0];
        const dy = p1[1] - p2[1];
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Check if a point is inside a rectangle
     * @param {Array} point - Point [x, y]
     * @param {Object} rect - Rectangle {x, y, width, height}
     * @returns {boolean} True if point is inside rectangle
     */
    pointInRect: (point, rect) => {
        return point[0] >= rect.x && 
               point[0] <= rect.x + rect.width &&
               point[1] >= rect.y && 
               point[1] <= rect.y + rect.height;
    },

    /**
     * Convert canvas coordinates to image coordinates
     * @param {number} canvasX - Canvas X coordinate
     * @param {number} canvasY - Canvas Y coordinate
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @param {number} imageWidth - Image width
     * @param {number} imageHeight - Image height
     * @returns {Array} Image coordinates [x, y]
     */
    canvasToImageCoords: (canvasX, canvasY, canvasWidth, canvasHeight, imageWidth, imageHeight) => {
        const scaleX = imageWidth / canvasWidth;
        const scaleY = imageHeight / canvasHeight;
        
        return [canvasX * scaleX, canvasY * scaleY];
    },

    /**
     * Convert image coordinates to canvas coordinates
     * @param {number} imageX - Image X coordinate
     * @param {number} imageY - Image Y coordinate
     * @param {number} imageWidth - Image width
     * @param {number} imageHeight - Image height
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @returns {Array} Canvas coordinates [x, y]
     */
    imageToCanvasCoords: (imageX, imageY, imageWidth, imageHeight, canvasWidth, canvasHeight) => {
        const scaleX = canvasWidth / imageWidth;
        const scaleY = canvasHeight / imageHeight;
        
        return [imageX * scaleX, imageY * scaleY];
    },

    /**
     * Calculate optimal canvas size maintaining aspect ratio
     * @param {number} imageWidth - Original image width
     * @param {number} imageHeight - Original image height
     * @param {number} maxWidth - Maximum canvas width
     * @param {number} maxHeight - Maximum canvas height
     * @returns {Object} Canvas dimensions {width, height, scale}
     */
    calculateCanvasSize: (imageWidth, imageHeight, maxWidth, maxHeight) => {
        const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
        
        return {
            width: imageWidth * scale,
            height: imageHeight * scale,
            scale: scale
        };
    },

    /**
     * Get quality description from coefficient of variation
     * @param {number} cv - Coefficient of variation
     * @returns {Object} Quality info {level, description, color}
     */
    getQualityInfo: (cv) => {
        if (cv < CONFIG.QUALITY.excellent) {
            return {
                level: 'excellent',
                description: 'Excellent',
                color: CONFIG.COLORS.excellent
            };
        } else if (cv < CONFIG.QUALITY.good) {
            return {
                level: 'good',
                description: 'Good',
                color: CONFIG.COLORS.good
            };
        } else {
            return {
                level: 'poor',
                description: 'Poor',
                color: CONFIG.COLORS.poor
            };
        }
    },

    /**
     * Validate alignment data
     * @param {Object} alignment - Alignment object
     * @returns {Object} Validation result {isValid, errors}
     */
    validateAlignment: (alignment) => {
        const errors = [];
        
        if (!alignment) {
            errors.push('Alignment data is missing');
            return { isValid: false, errors };
        }
        
        if (!Array.isArray(alignment.markers)) {
            errors.push('Alignment markers is not an array');
        } else if (alignment.markers.length !== 9) {
            errors.push(`Expected 9 markers, got ${alignment.markers.length}`);
        } else {
            alignment.markers.forEach((marker, index) => {
                if (!marker.imageX || !marker.imageY) {
                    errors.push(`Marker ${index} missing coordinates`);
                }
                if (!utils.isValidNumber(marker.imageX) || !utils.isValidNumber(marker.imageY)) {
                    errors.push(`Marker ${index} has invalid coordinates`);
                }
            });
        }
        
        if (typeof alignment.isComplete !== 'boolean') {
            errors.push('Alignment isComplete flag is not boolean');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    },

    /**
     * Log performance timing
     * @param {string} label - Performance label
     * @param {Function} fn - Function to time
     * @returns {*} Function result
     */
    timeFunction: async (label, fn) => {
        const start = performance.now();
        try {
            const result = await fn();
            const end = performance.now();
            console.log(`${label}: ${(end - start).toFixed(2)}ms`);
            return result;
        } catch (error) {
            const end = performance.now();
            console.log(`${label} (failed): ${(end - start).toFixed(2)}ms`);
            throw error;
        }
    },

    /**
     * Create a safe filename from a string
     * @param {string} filename - Original filename
     * @returns {string} Safe filename
     */
    sanitizeFilename: (filename) => {
        return filename
            .replace(/[^a-z0-9.\-_]/gi, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^_|_$/g, '');
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = utils;
}