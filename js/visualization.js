/**
 * Visualization Module
 * Handles drawing analysis visualizations and quality overlays
 */

const visualization = {
    /**
     * Draw analysis visualization on canvas
     * @param {string} canvasId - Canvas element ID
     * @param {Object} imageData - Image data object
     * @param {Array} qualityScores - Quality scores for each patch
     * @param {Object} alignment - Alignment data
     * @param {Object} options - Visualization options
     */
    drawAnalysis: (canvasId, imageData, qualityScores, alignment, options = {}) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element ${canvasId} not found`);
            return;
        }

        const ctx = canvas.getContext('2d');
        const { image } = imageData;
        
        // Set canvas size to match image
        canvas.width = image.width;
        canvas.height = image.height;
        
        // Draw base image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
        
        // Draw overlays
        visualization.drawQualityOverlays(ctx, qualityScores, alignment, options);
        
        console.log(`Drew analysis visualization on ${canvasId}`);
    },

    /**
     * Draw quality overlays on canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} qualityScores - Quality scores (CV values)
     * @param {Object} alignment - Alignment data
     * @param {Object} options - Visualization options
     */
    drawQualityOverlays: (ctx, qualityScores, alignment, options = {}) => {
        const { rows, cols, sampleSize } = CONFIG.GRID;
        const controlPoints = alignment.markers.map(m => [m.imageX, m.imageY]);
        
        const {
            showHeatmap = state.visualization.showHeatmap,
            showValues = state.visualization.showValues,
            showGrid = true,
            opacity = 0.7
        } = options;

        let scoreIndex = 0;
        
        ctx.save();
        
        // Draw patches
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const u = col / (cols - 1);
                const v = row / (rows - 1);
                const [centerX, centerY] = imageProcessor.interpolateGridPosition(u, v, controlPoints);
                
                const x = centerX - Math.floor(sampleSize / 2);
                const y = centerY - Math.floor(sampleSize / 2);
                
                if (utils.isMarkerPosition(row, col)) {
                    // Draw marker indicator
                    visualization.drawMarkerPatch(ctx, x, y, sampleSize, row, col);
                } else {
                    // Draw quality patch
                    const cv = qualityScores[scoreIndex];
                    visualization.drawQualityPatch(ctx, x, y, sampleSize, cv, scoreIndex, {
                        showHeatmap,
                        showValues,
                        opacity
                    });
                    scoreIndex++;
                }
            }
        }
        
        // Draw grid lines if requested
        if (showGrid) {
            visualization.drawGrid(ctx, alignment, { opacity: 0.3 });
        }
        
        ctx.restore();
    },

    /**
     * Draw a quality patch
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Patch size
     * @param {number} cv - Coefficient of variation
     * @param {number} index - Patch index
     * @param {Object} options - Drawing options
     */
    drawQualityPatch: (ctx, x, y, size, cv, index, options = {}) => {
        const { showHeatmap, showValues, opacity } = options;
        
        if (showHeatmap) {
            // Draw heatmap background
            const qualityInfo = utils.getQualityInfo(cv);
            ctx.fillStyle = `${qualityInfo.color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
            ctx.fillRect(x, y, size, size);
            
            // Draw border
            ctx.strokeStyle = qualityInfo.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, size, size);
        }
        
        if (showValues) {
            // Draw CV percentage text
            const text = (cv * 100).toFixed(1) + '%';
            visualization.drawCenteredText(ctx, text, x + size/2, y + size/2, {
                fontSize: Math.max(10, size * 0.2),
                fillColor: '#ffffff',
                strokeColor: '#000000',
                strokeWidth: 2
            });
        }
    },

    /**
     * Draw a marker patch
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Patch size
     * @param {number} row - Grid row
     * @param {number} col - Grid column
     */
    drawMarkerPatch: (ctx, x, y, size, row, col) => {
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x, y, size, size);
        
        // Marker border
        ctx.strokeStyle = CONFIG.COLORS.markerBorder;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, size, size);
        
        // Marker text
        visualization.drawCenteredText(ctx, 'M', x + size/2, y + size/2, {
            fontSize: Math.max(12, size * 0.3),
            fillColor: '#000000',
            strokeColor: '#ffffff',
            strokeWidth: 1
        });
    },

    /**
     * Draw centered text
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} text - Text to draw
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} options - Text options
     */
    drawCenteredText: (ctx, text, x, y, options = {}) => {
        const {
            fontSize = 12,
            fontFamily = 'Arial',
            fillColor = '#000000',
            strokeColor = null,
            strokeWidth = 1
        } = options;
        
        ctx.save();
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.strokeText(text, x, y);
        }
        
        ctx.fillStyle = fillColor;
        ctx.fillText(text, x, y);
        
        ctx.restore();
    },

    /**
     * Draw grid lines
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} alignment - Alignment data
     * @param {Object} options - Grid options
     */
    drawGrid: (ctx, alignment, options = {}) => {
        const { opacity = 0.3, color = CONFIG.COLORS.gridLine, lineWidth = 1 } = options;
        const { rows, cols } = CONFIG.GRID;
        const controlPoints = alignment.markers.map(m => [m.imageX, m.imageY]);
        
        ctx.save();
        ctx.strokeStyle = `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = lineWidth;
        
        // Draw horizontal lines
        for (let row = 0; row <= rows; row++) {
            ctx.beginPath();
            for (let col = 0; col <= cols; col++) {
                const u = col / (cols - 1);
                const v = row / (rows - 1);
                const [x, y] = imageProcessor.interpolateGridPosition(u, v, controlPoints);
                
                if (col === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }
        
        // Draw vertical lines
        for (let col = 0; col <= cols; col++) {
            ctx.beginPath();
            for (let row = 0; row <= rows; row++) {
                const u = col / (cols - 1);
                const v = row / (rows - 1);
                const [x, y] = imageProcessor.interpolateGridPosition(u, v, controlPoints);
                
                if (row === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }
        
        ctx.restore();
    },

    /**
     * Get quality color for CV value
     * @param {number} cv - Coefficient of variation
     * @returns {string} CSS color string
     */
    getQualityColor: (cv) => {
        if (cv < CONFIG.QUALITY.excellent) {
            return CONFIG.COLORS.excellent;
        } else if (cv < CONFIG.QUALITY.good) {
            return CONFIG.COLORS.good;
        } else {
            return CONFIG.COLORS.poor;
        }
    },

    /**
     * Update quality score display
     * @param {Array} refScores - Reference quality scores
     * @param {Array} camScores - Camera quality scores
     * @returns {Object} Quality statistics
     */
    updateQualityScore: (refScores, camScores) => {
        const refStats = visualization.calculateQualityStats(refScores);
        const camStats = visualization.calculateQualityStats(camScores);
        
        const scoreText = `Ref: ${refStats.goodPercent}% | Cam: ${camStats.goodPercent}%`;
        ui.updateQualityScore(scoreText);
        
        const overallScore = Math.min(refStats.goodPercent, camStats.goodPercent);
        
        console.log(`Quality scores - Reference: ${refStats.goodPercent}%, Camera: ${camStats.goodPercent}%`);
        
        return { refStats, camStats, overallScore };
    },

    /**
     * Calculate quality statistics from scores
     * @param {Array} scores - Array of CV scores
     * @returns {Object} Quality statistics
     */
    calculateQualityStats: (scores) => {
        if (!scores || scores.length === 0) {
            return {
                excellent: 0,
                good: 0,
                poor: 0,
                total: 0,
                excellentPercent: 0,
                goodPercent: 0,
                avgCV: 0
            };
        }
        
        const excellent = scores.filter(cv => cv < CONFIG.QUALITY.excellent).length;
        const good = scores.filter(cv => cv < CONFIG.QUALITY.good).length;
        const total = scores.length;
        const poor = total - good;
        
        const avgCV = scores.reduce((sum, cv) => sum + cv, 0) / total;
        
        return {
            excellent,
            good: good - excellent, // Good but not excellent
            poor,
            total,
            excellentPercent: Math.round((excellent / total) * 100),
            goodPercent: Math.round((good / total) * 100),
            avgCV
        };
    },

    /**
     * Update range statistics display
     * @param {Object} rangeData - Range analysis data
     */
    updateRangeStats: (rangeData) => {
        if (!rangeData) {
            ui.hideRangeStats();
            return;
        }
        
        ui.updateRangeStats(rangeData);
        console.log('Updated range statistics display');
    },

    /**
     * Create histogram visualization
     * @param {Array} data - Data array
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {Object} options - Histogram options
     * @returns {HTMLCanvasElement} Histogram canvas
     */
    createHistogram: (data, width, height, options = {}) => {
        const {
            bins = 50,
            color = '#3b82f6',
            backgroundColor = '#f8fafc',
            showGrid = true,
            title = 'Histogram'
        } = options;
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Calculate histogram
        const histogram = new Array(bins).fill(0);
        const binSize = 1.0 / bins;
        const margin = { top: 30, right: 20, bottom: 30, left: 40 };
        
        data.forEach(value => {
            const binIndex = Math.min(Math.floor(value / binSize), bins - 1);
            histogram[binIndex]++;
        });
        
        const maxCount = Math.max(...histogram);
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        
        // Draw histogram bars
        ctx.fillStyle = color;
        const barWidth = chartWidth / bins;
        
        histogram.forEach((count, i) => {
            const barHeight = (count / maxCount) * chartHeight;
            const x = margin.left + (i * barWidth);
            const y = margin.top + (chartHeight - barHeight);
            
            ctx.fillRect(x, y, barWidth - 1, barHeight);
        });
        
        // Draw axes and labels
        visualization.drawHistogramAxes(ctx, width, height, margin, bins, maxCount);
        
        // Title
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, width / 2, 20);
        
        return canvas;
    },

    /**
     * Draw histogram axes and labels
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {Object} margin - Margin object
     * @param {number} bins - Number of bins
     * @param {number} maxCount - Maximum count
     */
    drawHistogramAxes: (ctx, width, height, margin, bins, maxCount) => {
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 1;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#6b7280';
        
        // X-axis
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top + chartHeight);
        ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
        ctx.stroke();
        
        // Y-axis
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + chartHeight);
        ctx.stroke();
        
        // X-axis labels (0.0, 0.5, 1.0)
        [0, 0.5, 1.0].forEach(value => {
            const x = margin.left + (value * chartWidth);
            ctx.fillText(value.toFixed(1), x, height - 10);
        });
        
        // Y-axis labels
        ctx.textAlign = 'right';
        [0, maxCount / 2, maxCount].forEach((value, i) => {
            const y = margin.top + chartHeight - (i * chartHeight / 2);
            ctx.fillText(Math.round(value).toString(), margin.left - 5, y + 3);
        });
    },

    /**
     * Create scatter plot of color relationships
     * @param {Array} refColors - Reference colors
     * @param {Array} camColors - Camera colors
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {Object} options - Plot options
     * @returns {HTMLCanvasElement} Scatter plot canvas
     */
    createScatterPlot: (refColors, camColors, width, height, options = {}) => {
        const {
            channel = 'luminance', // 'luminance', 'red', 'green', 'blue'
            pointSize = 3,
            color = '#3b82f6',
            title = 'Color Relationship'
        } = options;
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        const margin = { top: 30, right: 20, bottom: 30, left: 40 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);
        
        // Extract channel data
        const refData = refColors.map(color => {
            switch (channel) {
                case 'red': return color[0];
                case 'green': return color[1];
                case 'blue': return color[2];
                case 'luminance':
                default: return utils.getLuminance(color);
            }
        });
        
        const camData = camColors.map(color => {
            switch (channel) {
                case 'red': return color[0];
                case 'green': return color[1];
                case 'blue': return color[2];
                case 'luminance':
                default: return utils.getLuminance(color);
            }
        });
        
        // Draw diagonal reference line
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top + chartHeight);
        ctx.lineTo(margin.left + chartWidth, margin.top);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw points
        ctx.fillStyle = color;
        refData.forEach((refValue, i) => {
            const camValue = camData[i];
            const x = margin.left + (refValue * chartWidth);
            const y = margin.top + ((1 - camValue) * chartHeight);
            
            ctx.beginPath();
            ctx.arc(x, y, pointSize, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw axes
        visualization.drawScatterAxes(ctx, width, height, margin, channel);
        
        // Title
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, width / 2, 20);
        
        return canvas;
    },

    /**
     * Draw scatter plot axes
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {Object} margin - Margin object
     * @param {string} channel - Color channel
     */
    drawScatterAxes: (ctx, width, height, margin, channel) => {
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 1;
        ctx.font = '10px Arial';
        ctx.fillStyle = '#6b7280';
        
        // Axes
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top + chartHeight);
        ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + chartHeight);
        ctx.stroke();
        
        // Labels
        const channelName = channel.charAt(0).toUpperCase() + channel.slice(1);
        
        ctx.textAlign = 'center';
        ctx.fillText(`Reference ${channelName}`, width / 2, height - 5);
        
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`Camera ${channelName}`, 0, 0);
        ctx.restore();
        
        // Tick marks
        ctx.textAlign = 'center';
        [0, 0.5, 1.0].forEach(value => {
            const x = margin.left + (value * chartWidth);
            const y = margin.top + ((1 - value) * chartHeight);
            
            ctx.fillText(value.toFixed(1), x, height - 10);
            
            ctx.textAlign = 'right';
            ctx.fillText(value.toFixed(1), margin.left - 5, y + 3);
            ctx.textAlign = 'center';
        });
    },

    /**
     * Create quality legend
     * @param {number} width - Legend width
     * @param {number} height - Legend height
     * @returns {HTMLCanvasElement} Legend canvas
     */
    createQualityLegend: (width = 300, height = 120) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);
        
        const legendItems = [
            { color: CONFIG.COLORS.excellent, label: 'Excellent (<5%)', cv: 0.03 },
            { color: CONFIG.COLORS.good, label: 'Good (5-15%)', cv: 0.10 },
            { color: CONFIG.COLORS.poor, label: 'Poor (>15%)', cv: 0.20 }
        ];
        
        const itemHeight = height / legendItems.length;
        
        legendItems.forEach((item, i) => {
            const y = i * itemHeight;
            
            // Color box
            ctx.fillStyle = item.color;
            ctx.fillRect(10, y + 10, 20, 20);
            
            // Label
            ctx.fillStyle = '#1f2937';
            ctx.font = '14px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(item.label, 40, y + 25);
        });
        
        return canvas;
    },

    /**
     * Export visualization as image
     * @param {string} canvasId - Canvas element ID
     * @param {string} filename - Output filename
     * @param {string} format - Image format ('png', 'jpeg')
     * @param {number} quality - JPEG quality (0-1)
     */
    exportVisualization: (canvasId, filename, format = 'png', quality = 0.9) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas ${canvasId} not found`);
            return;
        }
        
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const dataURL = canvas.toDataURL(mimeType, quality);
        
        ui.downloadFile(dataURL, `${filename}.${format}`, mimeType);
        
        console.log(`Exported visualization ${canvasId} as ${filename}.${format}`);
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = visualization;
}