/**
 * Alignment Module
 * Handles 9-point crosshair alignment functionality
 */

const alignmentModule = {
    /**
     * Start alignment process for an image
     * @param {string} imageType - Type of image ('reference' or 'camera')
     */
    startAlignment: (imageType) => {
        const imageData = imageType === 'reference' ? state.referenceImage : state.cameraImage;
        if (!imageData) {
            ui.showAlignmentStatus('Please upload an image first!', 'error');
            return;
        }

        console.log(`Starting alignment for ${imageType} image`);

        // Initialize alignment state
        StateManager.startAlignment(imageType);

        // Show alignment section
        ui.showSection('alignment');

        // Update UI elements
        const displayName = imageType === 'reference' ? 'Reference Chart' : 'Camera Capture';
        document.getElementById('alignmentSubtitle').textContent = 
            `Aligning ${displayName} - 9 Crosshairs`;

        // Setup canvas
        alignmentModule.setupCanvas(imageData);

        // Enable start button
        document.getElementById('startAlignBtn').disabled = false;

        // Reset UI state
        ui.resetMarkerProgress();
        ui.updateCanvasInfo(imageType, 'Click "Start Placement" to begin marking the 9 crosshair centers');

        // Scroll to alignment section
        ui.scrollToElement('#alignmentSection');
    },

    /**
     * Setup alignment canvas with image
     * @param {Object} imageData - Image data object
     */
    setupCanvas: (imageData) => {
        const canvas = document.getElementById('alignmentCanvas');
        const ctx = canvas.getContext('2d');

        // Calculate optimal canvas size
        const canvasSize = utils.calculateCanvasSize(
            imageData.width, 
            imageData.height, 
            CONFIG.CANVAS.maxWidth, 
            CONFIG.CANVAS.maxHeight
        );

        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;

        // Clear and draw image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageData.element, 0, 0, canvas.width, canvas.height);

        // Store scale for coordinate conversion
        state.currentAlignment.scale = canvasSize.scale;
        state.currentAlignment.canvasSize = canvasSize;

        console.log(`Canvas setup: ${canvas.width}×${canvas.height}, scale: ${canvasSize.scale.toFixed(3)}`);
    },

    /**
     * Start placing markers
     */
    startPlacingMarkers: () => {
        if (!state.currentAlignment.imageType) {
            ui.showAlignmentStatus('No image selected for alignment', 'error');
            return;
        }

        state.currentAlignment.isPlacing = true;
        state.currentAlignment.currentMarkerIndex = 0;
        state.currentAlignment.markers = [];

        // Update UI
        const canvas = document.getElementById('alignmentCanvas');
        canvas.classList.add('active');
        canvas.onclick = alignmentModule.handleCanvasClick;
        canvas.onmousemove = alignmentModule.handleCanvasMouseMove;
        canvas.onmouseleave = alignmentModule.hideZoomOverlay;

        // Update controls
        document.getElementById('startAlignBtn').disabled = true;
        document.getElementById('undoBtn').disabled = true;
        document.getElementById('acceptAlignBtn').disabled = true;

        // Update instructions
        const firstMarker = CONFIG.MARKERS[0];
        ui.updateCanvasInfo(
            state.currentAlignment.imageType,
            `Click on the center of the ${firstMarker.name} crosshair`
        );

        ui.resetMarkerProgress();
        ui.showAlignmentStatus('Click on the Top-Left crosshair center to start', 'warning');

        console.log('Started marker placement mode');
    },

    /**
     * Handle canvas click events
     * @param {MouseEvent} event - Mouse click event
     */
    handleCanvasClick: (event) => {
        if (!state.currentAlignment.isPlacing) return;

        const canvas = event.target;
        const rect = canvas.getBoundingClientRect();
        const imageData = state.currentAlignment.imageType === 'reference' ? 
            state.referenceImage : state.cameraImage;

        // Calculate click position
        const canvasX = event.clientX - rect.left;
        const canvasY = event.clientY - rect.top;
        
        // Convert to image coordinates
        const imageCoords = utils.canvasToImageCoords(
            canvasX, canvasY,
            canvas.width, canvas.height,
            imageData.width, imageData.height
        );

        // Create marker object
        const marker = {
            index: state.currentAlignment.currentMarkerIndex,
            imageX: imageCoords[0],
            imageY: imageCoords[1],
            canvasX: canvasX,
            canvasY: canvasY,
            markerInfo: CONFIG.MARKERS[state.currentAlignment.currentMarkerIndex],
            timestamp: Date.now()
        };

        // Add marker using state manager
        StateManager.addMarker(marker);

        // Update visualizations
        alignmentModule.drawMarkers();
        alignmentModule.updateUndoButton();

        // Check if we're done
        if (state.currentAlignment.currentMarkerIndex >= CONFIG.MARKERS.length) {
            alignmentModule.finishMarkerPlacement();
        } else {
            // Update instructions for next marker
            const nextMarker = CONFIG.MARKERS[state.currentAlignment.currentMarkerIndex];
            ui.updateCanvasInfo(
                state.currentAlignment.imageType,
                `Click on the center of the ${nextMarker.name} crosshair`
            );
            ui.showAlignmentStatus(`Next: Click on ${nextMarker.name} crosshair`, 'warning');
        }

        console.log(`Placed marker ${marker.index + 1}/9 at (${Math.round(marker.imageX)}, ${Math.round(marker.imageY)})`);
    },

    /**
     * Handle canvas mouse move for zoom overlay
     * @param {MouseEvent} event - Mouse move event
     */
    handleCanvasMouseMove: (event) => {
        if (!state.currentAlignment.isPlacing) return;
        
        const canvas = event.target;
        const zoomOverlay = document.getElementById('zoomOverlay');
        const zoomCanvas = document.getElementById('zoomCanvas');
        const zoomCtx = zoomCanvas.getContext('2d');
        
        // Get mouse position relative to the viewport
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        
        // Get canvas position for calculating image coordinates
        const rect = canvas.getBoundingClientRect();
        const canvasMouseX = event.clientX - rect.left;
        const canvasMouseY = event.clientY - rect.top;
        
        // Position zoom overlay - avoid edges
        const offsetX = canvasMouseX < canvas.width / 2 ? 15 : -195;
        const offsetY = canvasMouseY < canvas.height / 2 ? 15 : -195;
        
        zoomOverlay.style.left = (mouseX + offsetX) + 'px';
        zoomOverlay.style.top = (mouseY + offsetY) + 'px';
        zoomOverlay.style.display = 'block';
        
        // Clear zoom canvas
        zoomCtx.clearRect(0, 0, CONFIG.CANVAS.zoomSize, CONFIG.CANVAS.zoomSize);
        
        // Calculate source area for zoom
        const imageData = state.currentAlignment.imageType === 'reference' ? 
            state.referenceImage : state.cameraImage;
        
        const imageCoords = utils.canvasToImageCoords(
            canvasMouseX, canvasMouseY,
            canvas.width, canvas.height,
            imageData.width, imageData.height
        );
        
        const zoomRadius = CONFIG.CANVAS.zoomSize / (2 * CONFIG.CANVAS.zoomMagnification);
        const sourceX = imageCoords[0] - zoomRadius;
        const sourceY = imageCoords[1] - zoomRadius;
        const sourceSize = zoomRadius * 2;
        
        // Draw zoomed portion
        try {
            zoomCtx.drawImage(
                imageData.element, 
                sourceX, sourceY, sourceSize, sourceSize,
                0, 0, CONFIG.CANVAS.zoomSize, CONFIG.CANVAS.zoomSize
            );
        } catch (e) {
            // Handle edge cases where source area is outside image bounds
            console.warn('Zoom drawing error:', e);
        }
    },

    /**
     * Hide zoom overlay
     */
    hideZoomOverlay: () => {
        const zoomOverlay = document.getElementById('zoomOverlay');
        if (zoomOverlay) {
            zoomOverlay.style.display = 'none';
        }
    },

    /**
     * Draw markers on canvas
     */
    drawMarkers: () => {
        const canvas = document.getElementById('alignmentCanvas');
        const ctx = canvas.getContext('2d');
        const imageData = state.currentAlignment.imageType === 'reference' ? 
            state.referenceImage : state.cameraImage;

        // Redraw image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageData.element, 0, 0, canvas.width, canvas.height);

        // Draw placed markers
        state.currentAlignment.markers.forEach((marker, index) => {
            alignmentModule.drawMarker(ctx, marker, index + 1);
        });

        // Draw grid overlay if all markers placed
        if (state.currentAlignment.markers.length === CONFIG.MARKERS.length) {
            alignmentModule.drawGridOverlay(ctx);
        }
    },

    /**
     * Draw a single marker on canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} marker - Marker object
     * @param {number} number - Marker number for display
     */
    drawMarker: (ctx, marker, number) => {
        ctx.save();
        
        // Draw marker circle
        ctx.strokeStyle = CONFIG.COLORS.gridLine;
        ctx.fillStyle = `${CONFIG.COLORS.gridLine}30`; // Semi-transparent
        ctx.lineWidth = CONFIG.CANVAS.markerLineWidth;
        
        ctx.beginPath();
        ctx.arc(marker.canvasX, marker.canvasY, CONFIG.CANVAS.markerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw marker number
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.strokeText(number.toString(), marker.canvasX, marker.canvasY);
        ctx.fillText(number.toString(), marker.canvasX, marker.canvasY);
        
        ctx.restore();
    },

    /**
     * Draw grid overlay on canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    drawGridOverlay: (ctx) => {
        const markers = state.currentAlignment.markers;
        if (markers.length !== CONFIG.MARKERS.length) return;

        // Create control points from the markers
        const canvasControlPoints = markers.map(m => [m.canvasX, m.canvasY]);

        ctx.save();
        ctx.strokeStyle = `${CONFIG.COLORS.gridLine}CC`; // Semi-transparent blue
        ctx.lineWidth = CONFIG.CANVAS.gridLineWidth;
        ctx.setLineDash([]);

        const { rows, cols } = CONFIG.GRID;

        // Draw horizontal grid lines
        for (let row = 0; row <= rows; row++) {
            ctx.beginPath();
            for (let col = 0; col <= cols; col++) {
                const u = col / (cols - 1);
                const v = row / (rows - 1);
                const point = alignmentModule.interpolateCanvasGrid(u, v, canvasControlPoints);
                
                if (col === 0) {
                    ctx.moveTo(point[0], point[1]);
                } else {
                    ctx.lineTo(point[0], point[1]);
                }
            }
            ctx.stroke();
        }

        // Draw vertical grid lines
        for (let col = 0; col <= cols; col++) {
            ctx.beginPath();
            for (let row = 0; row <= rows; row++) {
                const u = col / (cols - 1);
                const v = row / (rows - 1);
                const point = alignmentModule.interpolateCanvasGrid(u, v, canvasControlPoints);
                
                if (row === 0) {
                    ctx.moveTo(point[0], point[1]);
                } else {
                    ctx.lineTo(point[0], point[1]);
                }
            }
            ctx.stroke();
        }

        // Draw sample points
        ctx.fillStyle = CONFIG.COLORS.excellent;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const u = col / (cols - 1);
                const v = row / (rows - 1);
                const point = alignmentModule.interpolateCanvasGrid(u, v, canvasControlPoints);

                if (utils.isMarkerPosition(row, col)) {
                    // Marker position - draw differently
                    ctx.fillStyle = CONFIG.COLORS.poor;
                    ctx.beginPath();
                    ctx.arc(point[0], point[1], 8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = CONFIG.COLORS.excellent;
                } else {
                    // Regular sample point
                    ctx.beginPath();
                    ctx.arc(point[0], point[1], 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
            }
        }

        ctx.restore();
    },

    /**
     * Interpolate grid position in canvas coordinates
     * @param {number} u - Normalized column position (0-1)
     * @param {number} v - Normalized row position (0-1)
     * @param {Array} controlPoints - Canvas control points
     * @returns {Array} Canvas coordinates [x, y]
     */
    interpolateCanvasGrid: (u, v, controlPoints) => {
        // Use the same interpolation logic as image processor but for canvas coordinates
        return imageProcessor.interpolateGridPosition(u, v, controlPoints);
    },

    /**
     * Finish marker placement
     */
    finishMarkerPlacement: () => {
        state.currentAlignment.isPlacing = false;
        state.currentAlignment.isComplete = true;

        // Update UI
        const canvas = document.getElementById('alignmentCanvas');
        canvas.classList.remove('active');
        canvas.onclick = null;
        canvas.onmousemove = null;
        canvas.onmouseleave = null;
        alignmentModule.hideZoomOverlay();

        // Update controls
        document.getElementById('startAlignBtn').disabled = false;
        document.getElementById('acceptAlignBtn').disabled = false;
        document.getElementById('undoBtn').disabled = true;

        // Update instructions
        ui.updateCanvasInfo(
            state.currentAlignment.imageType,
            'All 9 crosshairs placed! Grid overlay shows sample points.'
        );

        ui.showAlignmentStatus('All 9 crosshairs placed! Review the grid alignment and click Accept.', 'success');

        // Calculate and show alignment quality
        const quality = alignmentModule.calculateAlignmentQuality(state.currentAlignment);
        ui.showAlignmentScore(quality);

        console.log(`Alignment completed with quality score: ${(quality.score * 100).toFixed(1)}%`);
    },

    /**
     * Calculate alignment quality score
     * @param {Object} alignment - Alignment object
     * @returns {Object} Quality assessment
     */
    calculateAlignmentQuality: (alignment) => {
        const markers = alignment.markers;
        if (markers.length !== CONFIG.MARKERS.length) {
            return { score: 0, details: { error: 'Insufficient markers' } };
        }

        // Check grid regularity by examining spacing consistency
        const spacingChecks = [];

        // Horizontal spacing consistency
        const topSpacing = [
            Math.abs(markers[1].imageX - markers[0].imageX),
            Math.abs(markers[2].imageX - markers[1].imageX)
        ];
        const midSpacing = [
            Math.abs(markers[4].imageX - markers[3].imageX),
            Math.abs(markers[5].imageX - markers[4].imageX)
        ];
        const botSpacing = [
            Math.abs(markers[7].imageX - markers[6].imageX),
            Math.abs(markers[8].imageX - markers[7].imageX)
        ];

        // Calculate consistency scores
        const topConsistency = 1 - Math.abs(topSpacing[0] - topSpacing[1]) / Math.max(...topSpacing);
        const midConsistency = 1 - Math.abs(midSpacing[0] - midSpacing[1]) / Math.max(...midSpacing);
        const botConsistency = 1 - Math.abs(botSpacing[0] - botSpacing[1]) / Math.max(...botSpacing);

        // Vertical spacing consistency
        const leftColSpacing = [
            Math.abs(markers[3].imageY - markers[0].imageY),
            Math.abs(markers[6].imageY - markers[3].imageY)
        ];
        const rightColSpacing = [
            Math.abs(markers[5].imageY - markers[2].imageY),
            Math.abs(markers[8].imageY - markers[5].imageY)
        ];

        const leftConsistency = 1 - Math.abs(leftColSpacing[0] - leftColSpacing[1]) / Math.max(...leftColSpacing);
        const rightConsistency = 1 - Math.abs(rightColSpacing[0] - rightColSpacing[1]) / Math.max(...rightColSpacing);

        // Overall score
        const overallScore = (topConsistency + midConsistency + botConsistency + leftConsistency + rightConsistency) / 5;
        
        // Clamp score to valid range
        const finalScore = Math.max(0, Math.min(1, overallScore));

        return {
            score: finalScore,
            details: {
                horizontalConsistency: (topConsistency + midConsistency + botConsistency) / 3,
                verticalConsistency: (leftConsistency + rightConsistency) / 2,
                topSpacingConsistency: topConsistency,
                midSpacingConsistency: midConsistency,
                botSpacingConsistency: botConsistency,
                leftSpacingConsistency: leftConsistency,
                rightSpacingConsistency: rightConsistency
            }
        };
    },

    /**
     * Undo last placed marker
     */
    undoLastMarker: () => {
        if (!state.currentAlignment.isPlacing || state.currentAlignment.markers.length === 0) {
            return;
        }
        
        const removedMarker = StateManager.removeLastMarker();
        if (!removedMarker) return;

        // Update visualizations
        alignmentModule.drawMarkers();
        alignmentModule.updateUndoButton();

        // Update instructions
        if (state.currentAlignment.currentMarkerIndex < CONFIG.MARKERS.length) {
            const nextMarker = CONFIG.MARKERS[state.currentAlignment.currentMarkerIndex];
            ui.updateCanvasInfo(
                state.currentAlignment.imageType,
                `Click on the center of the ${nextMarker.name} crosshair`
            );
            ui.showAlignmentStatus(`Marker removed. Next: Click on ${nextMarker.name} crosshair`, 'warning');
        }

        console.log(`Undid marker ${removedMarker.index + 1}, now at ${state.currentAlignment.markers.length}/9`);
    },

    /**
     * Reset current alignment
     */
    resetAlignment: () => {
        if (!state.currentAlignment.imageType) return;

        const imageType = state.currentAlignment.imageType;
        
        // Reset alignment state
        StateManager.resetAlignment();
        StateManager.startAlignment(imageType);

        // Reset canvas
        const imageData = imageType === 'reference' ? state.referenceImage : state.cameraImage;
        if (imageData) {
            alignmentModule.setupCanvas(imageData);
        }

        // Reset UI
        ui.resetMarkerProgress();
        document.getElementById('startAlignBtn').disabled = false;
        document.getElementById('acceptAlignBtn').disabled = true;
        document.getElementById('undoBtn').disabled = true;
        
        const canvas = document.getElementById('alignmentCanvas');
        canvas.classList.remove('active');
        canvas.onclick = null;
        canvas.onmousemove = null;
        canvas.onmouseleave = null;
        alignmentModule.hideZoomOverlay();

        // Remove any preview score
        const existingScore = document.querySelector('.canvas-container .alignment-score');
        if (existingScore) {
            existingScore.remove();
        }

        ui.updateCanvasInfo(imageType, 'Click "Start Placement" to begin marking the 9 crosshair centers');
        ui.showAlignmentStatus('Alignment reset. Click Start Placement to begin again.', 'warning');

        console.log(`Reset alignment for ${imageType} image`);
    },

    /**
     * Accept current alignment
     */
    acceptAlignment: () => {
        if (!state.currentAlignment.isComplete) {
            ui.showAlignmentStatus('Alignment not complete', 'error');
            return;
        }

        const imageType = state.currentAlignment.imageType;
        
        // Calculate final quality
        const quality = alignmentModule.calculateAlignmentQuality(state.currentAlignment);
        
        // Store quality in alignment data
        const alignment = {
            markers: [...state.currentAlignment.markers],
            isComplete: true,
            quality: quality,
            timestamp: Date.now()
        };
        
        state.alignments[imageType] = alignment;

        // Use StateManager to complete alignment
        StateManager.completeAlignment();

        console.log(`Accepted alignment for ${imageType} with quality score: ${(quality.score * 100).toFixed(1)}%`);
    },

    /**
     * Update undo button state
     */
    updateUndoButton: () => {
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.disabled = !state.currentAlignment.isPlacing || state.currentAlignment.markers.length === 0;
        }
    },

    /**
     * Validate alignment data
     * @param {Object} alignment - Alignment to validate
     * @returns {Object} Validation result
     */
    validateAlignment: (alignment) => {
        return utils.validateAlignment(alignment);
    },

    /**
     * Export alignment data
     * @param {string} imageType - Image type
     * @returns {Object} Alignment data for export
     */
    exportAlignmentData: (imageType) => {
        const alignment = state.alignments[imageType];
        if (!alignment || !alignment.isComplete) {
            return null;
        }

        return {
            imageType,
            markers: alignment.markers.map(marker => ({
                index: marker.index,
                name: marker.markerInfo.name,
                imageX: marker.imageX,
                imageY: marker.imageY,
                timestamp: marker.timestamp
            })),
            quality: alignment.quality,
            timestamp: alignment.timestamp,
            version: `${CONFIG.VERSION.major}.${CONFIG.VERSION.minor}.${CONFIG.VERSION.patch}`
        };
    },

    /**
     * Import alignment data
     * @param {string} imageType - Image type
     * @param {Object} alignmentData - Alignment data to import
     * @returns {boolean} Success status
     */
    importAlignmentData: (imageType, alignmentData) => {
        try {
            // Validate imported data
            if (!alignmentData.markers || alignmentData.markers.length !== CONFIG.MARKERS.length) {
                throw new Error('Invalid marker data');
            }

            // Reconstruct markers
            const markers = alignmentData.markers.map(markerData => ({
                index: markerData.index,
                imageX: markerData.imageX,
                imageY: markerData.imageY,
                markerInfo: CONFIG.MARKERS[markerData.index],
                timestamp: markerData.timestamp || Date.now()
            }));

            // Store alignment
            state.alignments[imageType] = {
                markers: markers,
                isComplete: true,
                quality: alignmentData.quality || null,
                timestamp: alignmentData.timestamp || Date.now()
            };

            console.log(`Imported alignment for ${imageType}`);
            return true;

        } catch (error) {
            console.error('Failed to import alignment:', error);
            return false;
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = alignmentModule;
}