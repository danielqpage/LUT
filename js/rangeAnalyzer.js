/**
 * Range Analysis Module
 * Handles dynamic range analysis and luminance mapping for LUT generation
 */

const rangeAnalyzer = {
    /**
     * Analyze luminance range of color patches
     * @param {Array} patches - Array of color patches [r,g,b]
     * @returns {Object} Range analysis results
     */
    analyzeLuminanceRange: (patches) => {
        if (!patches || patches.length === 0) {
            throw new Error('No color patches provided for range analysis');
        }

        console.log(`Analyzing luminance range for ${patches.length} patches`);

        // Calculate luminance for each patch
        const luminances = patches.map(color => {
            if (!utils.isValidColor(color)) {
                console.warn('Invalid color found, using fallback', color);
                return 0.5; // Fallback luminance
            }
            return utils.getLuminance(color);
        });

        // Calculate basic statistics
        const sorted = [...luminances].sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const mean = luminances.reduce((sum, l) => sum + l, 0) / luminances.length;

        // Calculate robust statistics using percentiles
        const percentile5 = sorted[Math.floor(sorted.length * 0.05)];
        const percentile95 = sorted[Math.floor(sorted.length * 0.95)];
        const median = utils.calculateMedian(luminances);
        const std = utils.calculateStandardDeviation(luminances);

        // Use robust min/max for better range estimation
        const robustMin = percentile5;
        const robustMax = percentile95;
        const robustRange = robustMax - robustMin;

        // Calculate additional metrics
        const contrast = max - min;
        const robustContrast = robustRange;
        const dynamicRange = max > 0 ? max / Math.max(min, 0.001) : 1;

        const result = {
            // Basic statistics
            min,
            max,
            mean,
            median,
            std,
            
            // Robust statistics (preferred for LUT generation)
            robustMin,
            robustMax,
            range: robustRange,
            
            // Contrast and dynamic range
            contrast,
            robustContrast,
            dynamicRange,
            
            // Raw data
            luminances,
            
            // Histogram data for visualization
            histogram: rangeAnalyzer.calculateLuminanceHistogram(luminances),
            
            // Quality assessment
            quality: rangeAnalyzer.assessRangeQuality(luminances)
        };

        console.log(`Range analysis: ${robustMin.toFixed(3)} - ${robustMax.toFixed(3)} (range: ${robustRange.toFixed(3)})`);
        
        return result;
    },

    /**
     * Calculate luminance histogram
     * @param {Array} luminances - Array of luminance values
     * @param {number} bins - Number of histogram bins
     * @returns {Object} Histogram data
     */
    calculateLuminanceHistogram: (luminances, bins = 50) => {
        const histogram = new Array(bins).fill(0);
        const binSize = 1.0 / bins;

        luminances.forEach(lum => {
            const binIndex = Math.min(Math.floor(lum / binSize), bins - 1);
            histogram[binIndex]++;
        });

        // Normalize histogram
        const total = luminances.length;
        const normalized = histogram.map(count => count / total);

        return {
            bins,
            binSize,
            counts: histogram,
            normalized,
            labels: Array.from({ length: bins }, (_, i) => (i * binSize).toFixed(3))
        };
    },

    /**
     * Assess the quality of the luminance range
     * @param {Array} luminances - Array of luminance values
     * @returns {Object} Quality assessment
     */
    assessRangeQuality: (luminances) => {
        const sorted = [...luminances].sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const range = max - min;

        // Check for good dynamic range utilization
        const hasGoodRange = range > 0.3; // At least 30% of full range
        const hasFullRange = range > 0.8; // Uses 80%+ of full range
        
        // Check for proper distribution
        const mean = luminances.reduce((sum, l) => sum + l, 0) / luminances.length;
        const isWellCentered = mean > 0.2 && mean < 0.8;
        
        // Check for clipping
        const darkClipping = sorted.filter(l => l < 0.02).length / luminances.length;
        const brightClipping = sorted.filter(l => l > 0.98).length / luminances.length;
        const hasClipping = darkClipping > 0.05 || brightClipping > 0.05;

        // Calculate uniformity (how evenly distributed)
        const histogram = rangeAnalyzer.calculateLuminanceHistogram(luminances, 10);
        const uniformity = 1 - utils.calculateStandardDeviation(histogram.normalized) / 0.1;

        let score = 1.0;
        const issues = [];

        if (!hasGoodRange) {
            score -= 0.3;
            issues.push('Limited dynamic range');
        }
        
        if (!isWellCentered) {
            score -= 0.2;
            issues.push('Poor luminance distribution');
        }
        
        if (hasClipping) {
            score -= 0.3;
            issues.push('Luminance clipping detected');
        }
        
        if (uniformity < 0.5) {
            score -= 0.2;
            issues.push('Poor luminance uniformity');
        }

        score = Math.max(0, score);

        return {
            score: score,
            rating: score > 0.8 ? 'Excellent' : score > 0.6 ? 'Good' : score > 0.4 ? 'Fair' : 'Poor',
            hasGoodRange,
            hasFullRange,
            isWellCentered,
            hasClipping,
            darkClipping: darkClipping * 100, // As percentage
            brightClipping: brightClipping * 100,
            uniformity,
            issues
        };
    },

    /**
     * Calculate range mapping between reference and camera
     * @param {Object} refRange - Reference image range analysis
     * @param {Object} camRange - Camera image range analysis
     * @returns {Object} Range mapping configuration
     */
    calculateRangeMapping: (refRange, camRange) => {
        console.log('Calculating range mapping between reference and camera');

        // Use robust statistics for mapping
        const refMin = refRange.robustMin;
        const refMax = refRange.robustMax;
        const refSpan = refRange.range;
        
        const camMin = camRange.robustMin;
        const camMax = camRange.robustMax;
        const camSpan = camRange.range;

        // Calculate mapping parameters
        const rangeRatio = camSpan / Math.max(refSpan, 0.001);
        const luminanceOffset = camMin - (refMin * rangeRatio);

        // Calculate additional mapping modes
        const mappingModes = {
            // Direct mapping preserving relative positions
            linear: {
                scale: rangeRatio,
                offset: luminanceOffset,
                description: 'Linear scaling with offset'
            },
            
            // Stretch to fill camera range
            stretch: {
                scale: camSpan / Math.max(refSpan, 0.001),
                offset: camMin - (refMin * (camSpan / Math.max(refSpan, 0.001))),
                description: 'Stretch reference to fill camera range'
            },
            
            // Midpoint alignment
            midpoint: {
                scale: rangeRatio,
                offset: (camMin + camMax) / 2 - ((refMin + refMax) / 2) * rangeRatio,
                description: 'Align midpoints with scaling'
            },
            
            // Histogram matching (simplified)
            histogram: {
                scale: rangeRatio,
                offset: luminanceOffset,
                description: 'Histogram-based mapping',
                // Additional histogram matching data could be added here
            }
        };

        // Determine recommended mapping mode
        let recommendedMode = 'linear';
        if (Math.abs(rangeRatio - 1.0) > 0.3) {
            recommendedMode = 'stretch';
        } else if (Math.abs(luminanceOffset) > 0.2) {
            recommendedMode = 'midpoint';
        }

        const result = {
            // Primary mapping parameters (using linear mode)
            rangeRatio,
            luminanceOffset,
            
            // Range data
            refRange,
            camRange,
            refLuminances: refRange.luminances,
            camLuminances: camRange.luminances,
            
            // Mapping modes
            mappingModes,
            recommendedMode,
            
            // Quality assessment
            compatibility: rangeAnalyzer.assessRangeCompatibility(refRange, camRange),
            
            // Statistics
            stats: {
                refMean: refRange.mean,
                camMean: camRange.mean,
                refStd: refRange.std,
                camStd: camRange.std,
                meanShift: camRange.mean - refRange.mean,
                scaleChange: rangeRatio,
                offsetChange: luminanceOffset
            }
        };

        console.log(`Range mapping: scale=${rangeRatio.toFixed(3)}, offset=${luminanceOffset.toFixed(3)}, mode=${recommendedMode}`);
        
        return result;
    },

    /**
     * Assess compatibility between reference and camera ranges
     * @param {Object} refRange - Reference range analysis
     * @param {Object} camRange - Camera range analysis
     * @returns {Object} Compatibility assessment
     */
    assessRangeCompatibility: (refRange, camRange) => {
        const refSpan = refRange.range;
        const camSpan = camRange.range;
        
        // Range span similarity
        const spanRatio = camSpan / Math.max(refSpan, 0.001);
        const spanSimilar = spanRatio > 0.5 && spanRatio < 2.0;
        
        // Mean luminance similarity
        const meanDiff = Math.abs(refRange.mean - camRange.mean);
        const meanSimilar = meanDiff < 0.3;
        
        // Distribution similarity (simplified)
        const refSkewness = rangeAnalyzer.calculateSkewness(refRange.luminances);
        const camSkewness = rangeAnalyzer.calculateSkewness(camRange.luminances);
        const skewnessDiff = Math.abs(refSkewness - camSkewness);
        const distributionSimilar = skewnessDiff < 1.0;

        // Overall compatibility score
        let score = 1.0;
        const issues = [];

        if (!spanSimilar) {
            score -= 0.4;
            issues.push(spanRatio > 2.0 ? 'Camera range much larger' : 'Camera range much smaller');
        }
        
        if (!meanSimilar) {
            score -= 0.3;
            issues.push(camRange.mean > refRange.mean ? 'Camera exposure too bright' : 'Camera exposure too dark');
        }
        
        if (!distributionSimilar) {
            score -= 0.3;
            issues.push('Different luminance distributions');
        }

        score = Math.max(0, score);

        return {
            score,
            rating: score > 0.8 ? 'Excellent' : score > 0.6 ? 'Good' : score > 0.4 ? 'Fair' : 'Poor',
            spanSimilar,
            meanSimilar,
            distributionSimilar,
            spanRatio,
            meanDiff,
            skewnessDiff,
            issues,
            recommendation: rangeAnalyzer.getCompatibilityRecommendation(score, issues)
        };
    },

    /**
     * Calculate skewness of a distribution
     * @param {Array} values - Array of values
     * @returns {number} Skewness value
     */
    calculateSkewness: (values) => {
        const n = values.length;
        if (n < 3) return 0;

        const mean = values.reduce((sum, v) => sum + v, 0) / n;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
        const std = Math.sqrt(variance);

        if (std === 0) return 0;

        const skewness = values.reduce((sum, v) => sum + Math.pow((v - mean) / std, 3), 0) / n;
        return skewness;
    },

    /**
     * Get compatibility recommendation
     * @param {number} score - Compatibility score
     * @param {Array} issues - Array of compatibility issues
     * @returns {string} Recommendation text
     */
    getCompatibilityRecommendation: (score, issues) => {
        if (score > 0.8) {
            return 'Images are well-matched. Standard LUT generation recommended.';
        } else if (score > 0.6) {
            return 'Images are reasonably compatible. Range-aware LUT recommended.';
        } else if (score > 0.4) {
            return 'Significant differences detected. Consider adjusting camera settings or use range-aware mode.';
        } else {
            return 'Poor compatibility. Check camera settings, lighting, or consider manual adjustments.';
        }
    },

    /**
     * Apply range mapping to a color
     * @param {Array} inputColor - Input RGB color
     * @param {Object} rangeMapping - Range mapping configuration
     * @param {string} mode - Mapping mode ('linear', 'stretch', 'midpoint', 'histogram')
     * @returns {Array} Mapped RGB color
     */
    applyRangeMapping: (inputColor, rangeMapping, mode = 'linear') => {
        if (!utils.isValidColor(inputColor)) {
            console.warn('Invalid input color for range mapping:', inputColor);
            return [0.5, 0.5, 0.5];
        }

        const mappingConfig = rangeMapping.mappingModes[mode] || rangeMapping.mappingModes.linear;
        const { scale, offset } = mappingConfig;

        // Calculate input luminance
        const inputLuminance = utils.getLuminance(inputColor);
        
        // Apply mapping
        const mappedLuminance = (inputLuminance * scale) + offset;
        const clampedLuminance = utils.clamp(mappedLuminance, 0, 1);
        
        // Calculate luminance ratio for color scaling
        const luminanceRatio = inputLuminance > 0.001 ? clampedLuminance / inputLuminance : 1.0;
        
        // Apply ratio to RGB channels
        const mappedColor = inputColor.map(channel => 
            utils.clamp(channel * luminanceRatio, 0, 1)
        );

        return mappedColor;
    },

    /**
     * Create a tone curve from range mapping
     * @param {Object} rangeMapping - Range mapping configuration
     * @param {number} points - Number of curve points
     * @param {string} mode - Mapping mode
     * @returns {Array} Tone curve points [[input, output], ...]
     */
    createToneCurve: (rangeMapping, points = 256, mode = 'linear') => {
        const curve = [];
        const mappingConfig = rangeMapping.mappingModes[mode] || rangeMapping.mappingModes.linear;
        const { scale, offset } = mappingConfig;

        for (let i = 0; i < points; i++) {
            const input = i / (points - 1);
            const output = utils.clamp((input * scale) + offset, 0, 1);
            curve.push([input, output]);
        }

        return curve;
    },

    /**
     * Analyze color temperature differences
     * @param {Array} refPatches - Reference color patches
     * @param {Array} camPatches - Camera color patches
     * @returns {Object} Color temperature analysis
     */
    analyzeColorTemperature: (refPatches, camPatches) => {
        if (refPatches.length !== camPatches.length) {
            throw new Error('Patch arrays must have the same length');
        }

        // Calculate average color for neutral estimation
        const refAvg = rangeAnalyzer.calculateAverageColor(refPatches);
        const camAvg = rangeAnalyzer.calculateAverageColor(camPatches);

        // Simple white balance estimation using gray patches
        const whiteBalanceRatio = [
            camAvg[0] / Math.max(refAvg[0], 0.001),
            camAvg[1] / Math.max(refAvg[1], 0.001),
            camAvg[2] / Math.max(refAvg[2], 0.001)
        ];

        // Estimate color temperature shift (simplified)
        const rg_ratio_ref = refAvg[0] / Math.max(refAvg[1], 0.001);
        const rg_ratio_cam = camAvg[0] / Math.max(camAvg[1], 0.001);
        const colorTemperatureShift = rg_ratio_cam - rg_ratio_ref;

        return {
            refAverage: refAvg,
            camAverage: camAvg,
            whiteBalanceRatio,
            colorTemperatureShift,
            isWarmer: colorTemperatureShift > 0.05,
            isCooler: colorTemperatureShift < -0.05,
            recommendation: Math.abs(colorTemperatureShift) > 0.1 ? 
                'Significant color temperature difference detected' : 
                'Color temperature reasonably matched'
        };
    },

    /**
     * Calculate average color from patches
     * @param {Array} patches - Array of color patches
     * @returns {Array} Average RGB color
     */
    calculateAverageColor: (patches) => {
        if (patches.length === 0) return [0.5, 0.5, 0.5];

        const sum = patches.reduce((acc, color) => [
            acc[0] + color[0],
            acc[1] + color[1],
            acc[2] + color[2]
        ], [0, 0, 0]);

        return [
            sum[0] / patches.length,
            sum[1] / patches.length,
            sum[2] / patches.length
        ];
    },

    /**
     * Generate range analysis report
     * @param {Object} refRange - Reference range analysis
     * @param {Object} camRange - Camera range analysis
     * @param {Object} mapping - Range mapping (optional)
     * @returns {Object} Detailed analysis report
     */
    generateAnalysisReport: (refRange, camRange, mapping = null) => {
        const report = {
            timestamp: new Date().toISOString(),
            reference: {
                range: `${refRange.robustMin.toFixed(3)} - ${refRange.robustMax.toFixed(3)}`,
                span: refRange.range.toFixed(3),
                mean: refRange.mean.toFixed(3),
                quality: refRange.quality
            },
            camera: {
                range: `${camRange.robustMin.toFixed(3)} - ${camRange.robustMax.toFixed(3)}`,
                span: camRange.range.toFixed(3),
                mean: camRange.mean.toFixed(3),
                quality: camRange.quality
            },
            compatibility: null,
            recommendations: []
        };

        if (mapping) {
            report.compatibility = mapping.compatibility;
            report.mapping = {
                mode: mapping.recommendedMode,
                scale: mapping.rangeRatio.toFixed(3),
                offset: mapping.luminanceOffset.toFixed(3)
            };
            
            // Add recommendations
            if (mapping.compatibility.score < 0.6) {
                report.recommendations.push('Use range-aware LUT generation');
            }
            
            if (mapping.stats.scaleChange > 1.5 || mapping.stats.scaleChange < 0.67) {
                report.recommendations.push('Consider adjusting camera exposure');
            }
            
            if (Math.abs(mapping.stats.offsetChange) > 0.3) {
                report.recommendations.push('Check lighting consistency between captures');
            }
        }

        return report;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = rangeAnalyzer;
}