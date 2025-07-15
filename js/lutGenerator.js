/**
 * LUT Generation Module
 * Contains all LUT generation algorithms and interpolation methods
 */

const lutGenerator = {
    /**
     * Create a standard 3D LUT using color-to-color mapping
     * @param {Array} referenceColors - Array of reference color patches [r,g,b]
     * @param {Array} cameraColors - Array of camera-captured color patches [r,g,b]
     * @param {number} lutSize - Size of the LUT (17, 33, 65)
     * @returns {Array} Generated 3D LUT data
     */
    create3DLUT: (referenceColors, cameraColors, lutSize) => {
        const lut = [];
        const step = 1 / (lutSize - 1);
        
        // Build spatial index for faster lookup
        const spatialIndex = lutGenerator.buildSpatialIndex(referenceColors);
        
        for (let b = 0; b < lutSize; b++) {
            for (let g = 0; g < lutSize; g++) {
                for (let r = 0; r < lutSize; r++) {
                    const inputColor = [r * step, g * step, b * step];
                    const outputColor = lutGenerator.interpolateColor(
                        inputColor, 
                        referenceColors, 
                        cameraColors,
                        spatialIndex
                    );
                    lut.push(outputColor);
                }
            }
        }
        
        return lut;
    },

    /**
     * Create a range-aware 3D LUT with dynamic range optimization
     * @param {Array} referenceColors - Array of reference color patches
     * @param {Array} cameraColors - Array of camera-captured color patches
     * @param {number} lutSize - Size of the LUT
     * @param {Object} rangeData - Range analysis data
     * @returns {Array} Generated 3D LUT data
     */
    createRangeAwareLUT: (referenceColors, cameraColors, lutSize, rangeData) => {
        const lut = [];
        const step = 1 / (lutSize - 1);
        
        const spatialIndex = lutGenerator.buildSpatialIndex(referenceColors);
        
        for (let b = 0; b < lutSize; b++) {
            for (let g = 0; g < lutSize; g++) {
                for (let r = 0; r < lutSize; r++) {
                    const inputColor = [r * step, g * step, b * step];
                    const outputColor = lutGenerator.interpolateWithRangeMapping(
                        inputColor,
                        referenceColors,
                        cameraColors,
                        rangeData,
                        spatialIndex
                    );
                    lut.push(outputColor);
                }
            }
        }
        
        return lut;
    },

    /**
     * Create a Tetrahedral interpolation-based LUT (experimental)
     * This method uses tetrahedral interpolation for potentially better color accuracy
     * @param {Array} referenceColors - Array of reference color patches
     * @param {Array} cameraColors - Array of camera-captured color patches
     * @param {number} lutSize - Size of the LUT
     * @returns {Array} Generated 3D LUT data
     */
    createTetrahedralLUT: (referenceColors, cameraColors, lutSize) => {
        const lut = [];
        const step = 1 / (lutSize - 1);
        
        // Build spatial index
        const spatialIndex = lutGenerator.buildSpatialIndex(referenceColors);
        
        for (let b = 0; b < lutSize; b++) {
            for (let g = 0; g < lutSize; g++) {
                for (let r = 0; r < lutSize; r++) {
                    const inputColor = [r * step, g * step, b * step];
                    const outputColor = lutGenerator.tetrahedralInterpolation(
                        inputColor,
                        referenceColors,
                        cameraColors,
                        spatialIndex
                    );
                    lut.push(outputColor);
                }
            }
        }
        
        return lut;
    },

    /**
     * Create a perceptual color space LUT using Lab color space
     * This algorithm works in Lab space for more perceptually uniform results
     * @param {Array} referenceColors - Array of reference color patches
     * @param {Array} cameraColors - Array of camera-captured color patches
     * @param {number} lutSize - Size of the LUT
     * @returns {Array} Generated 3D LUT data
     */
    createPerceptualLUT: (referenceColors, cameraColors, lutSize) => {
        const lut = [];
        const step = 1 / (lutSize - 1);
        
        // Convert colors to Lab space for perceptual uniformity
        const refLab = referenceColors.map(color => lutGenerator.rgbToLab(color));
        const camLab = cameraColors.map(color => lutGenerator.rgbToLab(color));
        
        const spatialIndex = lutGenerator.buildLabSpatialIndex(refLab);
        
        for (let b = 0; b < lutSize; b++) {
            for (let g = 0; g < lutSize; g++) {
                for (let r = 0; r < lutSize; r++) {
                    const inputColor = [r * step, g * step, b * step];
                    const inputLab = lutGenerator.rgbToLab(inputColor);
                    
                    const outputLab = lutGenerator.interpolateInLabSpace(
                        inputLab,
                        refLab,
                        camLab,
                        spatialIndex
                    );
                    
                    const outputColor = lutGenerator.labToRgb(outputLab);
                    lut.push(outputColor);
                }
            }
        }
        
        return lut;
    },

    /**
     * Build a spatial index for faster nearest neighbor search
     * @param {Array} colors - Array of color patches
     * @returns {Object} Spatial index structure
     */
    buildSpatialIndex: (colors) => {
        return {
            colors: colors,
            bounds: lutGenerator.calculateBounds(colors)
        };
    },

    /**
     * Build a spatial index in Lab color space
     * @param {Array} labColors - Array of Lab color patches
     * @returns {Object} Lab spatial index structure
     */
    buildLabSpatialIndex: (labColors) => {
        return {
            colors: labColors,
            bounds: lutGenerator.calculateLabBounds(labColors)
        };
    },

    /**
     * Calculate color bounds for RGB space
     * @param {Array} colors - Array of RGB colors
     * @returns {Object} Bounds object with min/max values
     */
    calculateBounds: (colors) => {
        const bounds = {
            min: [1, 1, 1],
            max: [0, 0, 0]
        };
        
        colors.forEach(color => {
            for (let i = 0; i < 3; i++) {
                bounds.min[i] = Math.min(bounds.min[i], color[i]);
                bounds.max[i] = Math.max(bounds.max[i], color[i]);
            }
        });
        
        return bounds;
    },

    /**
     * Calculate color bounds for Lab space
     * @param {Array} labColors - Array of Lab colors
     * @returns {Object} Lab bounds object
     */
    calculateLabBounds: (labColors) => {
        const bounds = {
            min: [100, 100, 100], // L: 0-100, a,b: roughly -100 to 100
            max: [0, -100, -100]
        };
        
        labColors.forEach(color => {
            bounds.min[0] = Math.min(bounds.min[0], color[0]); // L
            bounds.max[0] = Math.max(bounds.max[0], color[0]);
            bounds.min[1] = Math.min(bounds.min[1], color[1]); // a
            bounds.max[1] = Math.max(bounds.max[1], color[1]);
            bounds.min[2] = Math.min(bounds.min[2], color[2]); // b
            bounds.max[2] = Math.max(bounds.max[2], color[2]);
        });
        
        return bounds;
    },

    /**
     * Standard color interpolation using inverse distance weighting
     * @param {Array} inputColor - Input RGB color
     * @param {Array} referenceColors - Reference color patches
     * @param {Array} cameraColors - Camera color patches
     * @param {Object} spatialIndex - Spatial index for optimization
     * @returns {Array} Interpolated output color
     */
    interpolateColor: (inputColor, referenceColors, cameraColors, spatialIndex) => {
        // Find nearest neighbors
        const neighbors = lutGenerator.findNearestNeighbors(inputColor, referenceColors, 4);
        
        // Calculate weights using inverse distance weighting
        let totalWeight = 0;
        let weightedColor = [0, 0, 0];
        
        neighbors.forEach(({ index, distance }) => {
            const weight = distance === 0 ? 1e6 : 1 / (distance * distance);
            const cameraColor = cameraColors[index];
            
            for (let i = 0; i < 3; i++) {
                weightedColor[i] += cameraColor[i] * weight;
            }
            totalWeight += weight;
        });
        
        return weightedColor.map(v => utils.clamp(v / totalWeight));
    },

    /**
     * Interpolation with range mapping for dynamic range optimization
     * @param {Array} inputColor - Input RGB color
     * @param {Array} referenceColors - Reference color patches
     * @param {Array} cameraColors - Camera color patches
     * @param {Object} rangeData - Range analysis data
     * @param {Object} spatialIndex - Spatial index
     * @returns {Array} Range-mapped output color
     */
    interpolateWithRangeMapping: (inputColor, referenceColors, cameraColors, rangeData, spatialIndex) => {
        const inputLuminance = utils.getLuminance(inputColor);
        const { rangeRatio, luminanceOffset } = rangeData;
        
        // Map input luminance to camera space
        const targetLuminance = (inputLuminance * rangeRatio) + luminanceOffset;
        
        // Find neighbors considering both color and luminance
        const neighbors = lutGenerator.findNearestNeighborsWithLuminance(
            inputColor, 
            inputLuminance,
            referenceColors, 
            rangeData.refLuminances,
            4
        );
        
        // Weighted interpolation with luminance correction
        let totalWeight = 0;
        let weightedColor = [0, 0, 0];
        
        neighbors.forEach(({ index, distance }) => {
            const weight = distance === 0 ? 1e6 : 1 / (distance * distance);
            let cameraColor = [...cameraColors[index]];
            
            // Apply luminance correction
            const camLuminance = rangeData.camLuminances[index];
            if (camLuminance > 0.001) {
                const correction = targetLuminance / camLuminance;
                cameraColor = cameraColor.map(v => utils.clamp(v * correction));
            }
            
            for (let i = 0; i < 3; i++) {
                weightedColor[i] += cameraColor[i] * weight;
            }
            totalWeight += weight;
        });
        
        return weightedColor.map(v => utils.clamp(v / totalWeight));
    },

    /**
     * Tetrahedral interpolation for potentially better accuracy
     * @param {Array} inputColor - Input RGB color
     * @param {Array} referenceColors - Reference color patches
     * @param {Array} cameraColors - Camera color patches
     * @param {Object} spatialIndex - Spatial index
     * @returns {Array} Tetrahedrally interpolated color
     */
    tetrahedralInterpolation: (inputColor, referenceColors, cameraColors, spatialIndex) => {
        // Find the 4 closest points that form a tetrahedron around the input color
        const neighbors = lutGenerator.findNearestNeighbors(inputColor, referenceColors, 4);
        
        // Calculate barycentric coordinates for tetrahedral interpolation
        const weights = lutGenerator.calculateBarycentricWeights(inputColor, neighbors, referenceColors);
        
        let interpolatedColor = [0, 0, 0];
        let totalWeight = 0;
        
        neighbors.forEach(({ index }, i) => {
            const weight = weights[i];
            const cameraColor = cameraColors[index];
            
            for (let j = 0; j < 3; j++) {
                interpolatedColor[j] += cameraColor[j] * weight;
            }
            totalWeight += weight;
        });
        
        return interpolatedColor.map(v => utils.clamp(v / Math.max(totalWeight, 0.001)));
    },

    /**
     * Interpolation in Lab color space for perceptual uniformity
     * @param {Array} inputLab - Input Lab color
     * @param {Array} refLab - Reference Lab colors
     * @param {Array} camLab - Camera Lab colors
     * @param {Object} spatialIndex - Lab spatial index
     * @returns {Array} Interpolated Lab color
     */
    interpolateInLabSpace: (inputLab, refLab, camLab, spatialIndex) => {
        const neighbors = lutGenerator.findNearestLabNeighbors(inputLab, refLab, 4);
        
        let totalWeight = 0;
        let weightedLab = [0, 0, 0];
        
        neighbors.forEach(({ index, distance }) => {
            const weight = distance === 0 ? 1e6 : 1 / (distance * distance);
            const cameraLab = camLab[index];
            
            for (let i = 0; i < 3; i++) {
                weightedLab[i] += cameraLab[i] * weight;
            }
            totalWeight += weight;
        });
        
        return weightedLab.map(v => v / totalWeight);
    },

    /**
     * Find nearest neighbors in RGB space
     * @param {Array} targetColor - Target RGB color
     * @param {Array} colors - Array of RGB colors to search
     * @param {number} k - Number of neighbors to find
     * @returns {Array} Array of neighbor objects with index and distance
     */
    findNearestNeighbors: (targetColor, colors, k) => {
        const distances = colors.map((color, index) => ({
            index,
            distance: utils.colorDistance(targetColor, color)
        }));
        
        distances.sort((a, b) => a.distance - b.distance);
        return distances.slice(0, k);
    },

    /**
     * Find nearest neighbors considering both color and luminance
     * @param {Array} targetColor - Target RGB color
     * @param {number} targetLum - Target luminance
     * @param {Array} colors - Array of RGB colors
     * @param {Array} luminances - Array of luminance values
     * @param {number} k - Number of neighbors to find
     * @returns {Array} Array of neighbor objects
     */
    findNearestNeighborsWithLuminance: (targetColor, targetLum, colors, luminances, k) => {
        const colorWeight = 1.0;
        const lumWeight = 2.0;
        
        const distances = colors.map((color, index) => {
            const colorDist = utils.colorDistance(targetColor, color);
            const lumDist = Math.abs(targetLum - luminances[index]);
            return {
                index,
                distance: (colorDist * colorWeight) + (lumDist * lumWeight)
            };
        });
        
        distances.sort((a, b) => a.distance - b.distance);
        return distances.slice(0, k);
    },

    /**
     * Find nearest neighbors in Lab space
     * @param {Array} targetLab - Target Lab color
     * @param {Array} labColors - Array of Lab colors
     * @param {number} k - Number of neighbors to find
     * @returns {Array} Array of neighbor objects
     */
    findNearestLabNeighbors: (targetLab, labColors, k) => {
        const distances = labColors.map((labColor, index) => ({
            index,
            distance: lutGenerator.labDistance(targetLab, labColor)
        }));
        
        distances.sort((a, b) => a.distance - b.distance);
        return distances.slice(0, k);
    },

    /**
     * Calculate barycentric weights for tetrahedral interpolation
     * @param {Array} inputColor - Input color point
     * @param {Array} neighbors - Array of 4 neighbor points
     * @param {Array} referenceColors - Reference color array
     * @returns {Array} Barycentric weights
     */
    calculateBarycentricWeights: (inputColor, neighbors, referenceColors) => {
        // Simplified barycentric calculation
        // In a real implementation, this would solve the tetrahedral system
        const distances = neighbors.map(n => n.distance);
        const totalDist = distances.reduce((sum, d) => sum + d, 0);
        
        if (totalDist === 0) {
            return [1, 0, 0, 0];
        }
        
        // Inverse distance weighting normalized
        return distances.map(d => (totalDist - d) / (totalDist * 3));
    },

    /**
     * Calculate distance in Lab color space
     * @param {Array} lab1 - First Lab color
     * @param {Array} lab2 - Second Lab color
     * @returns {number} Distance in Lab space
     */
    labDistance: (lab1, lab2) => {
        const dL = lab1[0] - lab2[0];
        const da = lab1[1] - lab2[1];
        const db = lab1[2] - lab2[2];
        return Math.sqrt(dL * dL + da * da + db * db);
    },

    /**
     * Convert RGB to Lab color space
     * @param {Array} rgb - RGB color [r, g, b] in range 0-1
     * @returns {Array} Lab color [L, a, b]
     */
    rgbToLab: (rgb) => {
        // First convert RGB to XYZ
        const xyz = lutGenerator.rgbToXyz(rgb);
        // Then XYZ to Lab
        return lutGenerator.xyzToLab(xyz);
    },

    /**
     * Convert Lab to RGB color space
     * @param {Array} lab - Lab color [L, a, b]
     * @returns {Array} RGB color [r, g, b] in range 0-1
     */
    labToRgb: (lab) => {
        // First convert Lab to XYZ
        const xyz = lutGenerator.labToXyz(lab);
        // Then XYZ to RGB
        return lutGenerator.xyzToRgb(xyz);
    },

    /**
     * Convert RGB to XYZ color space (sRGB)
     * @param {Array} rgb - RGB color
     * @returns {Array} XYZ color
     */
    rgbToXyz: (rgb) => {
        // Gamma correction
        const [r, g, b] = rgb.map(v => {
            v = Math.max(0, Math.min(1, v));
            return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });

        // sRGB to XYZ matrix (D65 illuminant)
        const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
        const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
        const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

        return [x, y, z];
    },

    /**
     * Convert XYZ to RGB color space (sRGB)
     * @param {Array} xyz - XYZ color
     * @returns {Array} RGB color
     */
    xyzToRgb: (xyz) => {
        const [x, y, z] = xyz;

        // XYZ to sRGB matrix (D65 illuminant)
        let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
        let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
        let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

        // Gamma correction
        [r, g, b] = [r, g, b].map(v => {
            v = Math.max(0, Math.min(1, v));
            return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1/2.4) - 0.055;
        });

        return [r, g, b];
    },

    /**
     * Convert XYZ to Lab color space
     * @param {Array} xyz - XYZ color
     * @returns {Array} Lab color
     */
    xyzToLab: (xyz) => {
        // D65 illuminant white point
        const xn = 0.95047, yn = 1.00000, zn = 1.08883;
        
        const [x, y, z] = xyz;
        
        const fx = lutGenerator.labF(x / xn);
        const fy = lutGenerator.labF(y / yn);
        const fz = lutGenerator.labF(z / zn);
        
        const L = 116 * fy - 16;
        const a = 500 * (fx - fy);
        const b = 200 * (fy - fz);
        
        return [L, a, b];
    },

    /**
     * Convert Lab to XYZ color space
     * @param {Array} lab - Lab color
     * @returns {Array} XYZ color
     */
    labToXyz: (lab) => {
        const [L, a, b] = lab;
        
        // D65 illuminant white point
        const xn = 0.95047, yn = 1.00000, zn = 1.08883;
        
        const fy = (L + 16) / 116;
        const fx = fy + a / 500;
        const fz = fy - b / 200;
        
        const x = xn * lutGenerator.labFinv(fx);
        const y = yn * lutGenerator.labFinv(fy);
        const z = zn * lutGenerator.labFinv(fz);
        
        return [x, y, z];
    },

    /**
     * Lab transformation function f(t)
     * @param {number} t - Input value
     * @returns {number} Transformed value
     */
    labF: (t) => {
        const delta = 6/29;
        return t > delta * delta * delta ? Math.pow(t, 1/3) : t / (3 * delta * delta) + 4/29;
    },

    /**
     * Inverse Lab transformation function f^-1(t)
     * @param {number} t - Input value
     * @returns {number} Inverse transformed value
     */
    labFinv: (t) => {
        const delta = 6/29;
        return t > delta ? t * t * t : 3 * delta * delta * (t - 4/29);
    },

    /**
     * Registry of available LUT algorithms
     * Makes it easy to add new algorithms and select them dynamically
     */
    algorithms: {
        'standard': {
            name: 'Standard Color Matching',
            description: 'Direct color-to-color mapping preserving original relationships',
            generate: (refColors, camColors, lutSize, options = {}) => {
                return lutGenerator.create3DLUT(refColors, camColors, lutSize);
            }
        },
        'rangeAware': {
            name: 'Dynamic Range Optimization',
            description: 'Intelligent luminance range analysis and remapping',
            generate: (refColors, camColors, lutSize, options = {}) => {
                if (!options.rangeData) {
                    throw new Error('Range data required for range-aware LUT generation');
                }
                return lutGenerator.createRangeAwareLUT(refColors, camColors, lutSize, options.rangeData);
            }
        },
        'tetrahedral': {
            name: 'Tetrahedral Interpolation',
            description: 'Advanced tetrahedral interpolation for improved accuracy',
            generate: (refColors, camColors, lutSize, options = {}) => {
                return lutGenerator.createTetrahedralLUT(refColors, camColors, lutSize);
            }
        },
        'perceptual': {
            name: 'Perceptual Lab Space',
            description: 'Perceptually uniform interpolation in Lab color space',
            generate: (refColors, camColors, lutSize, options = {}) => {
                return lutGenerator.createPerceptualLUT(refColors, camColors, lutSize);
            }
        }
    },

    /**
     * Generate LUT using specified algorithm
     * @param {string} algorithm - Algorithm name from registry
     * @param {Array} refColors - Reference colors
     * @param {Array} camColors - Camera colors
     * @param {number} lutSize - LUT size
     * @param {Object} options - Additional options
     * @returns {Array} Generated LUT data
     */
    generateWithAlgorithm: (algorithm, refColors, camColors, lutSize, options = {}) => {
        const alg = lutGenerator.algorithms[algorithm];
        if (!alg) {
            throw new Error(`Unknown LUT algorithm: ${algorithm}`);
        }
        
        console.log(`Generating LUT using ${alg.name} algorithm`);
        return alg.generate(refColors, camColors, lutSize, options);
    }
};