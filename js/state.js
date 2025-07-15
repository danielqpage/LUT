/**
 * State Management Module
 * Centralized state management for the application
 */

// Application state
const state = {
    // Image data
    referenceImage: null,
    cameraImage: null,
    
    // Current LUT mode
    lutMode: 'standard',
    
    // Analysis results
    analysisData: null,
    rangeData: null,
    
    // Visualization settings
    visualization: {
        showHeatmap: true,
        showValues: true
    },
    
    // Current alignment state
    currentAlignment: {
        imageType: null,        // 'reference' or 'camera'
        currentMarkerIndex: 0,  // Current marker being placed (0-8)
        isPlacing: false,       // Whether user is currently placing markers
        markers: [],            // Array of placed markers
        isComplete: false       // Whether all 9 markers are placed
    },
    
    // Completed alignments for both images
    alignments: {
        reference: {
            markers: [],
            gridCorners: [],
            isComplete: false,
            quality: null
        },
        camera: {
            markers: [],
            gridCorners: [],
            isComplete: false,
            quality: null
        }
    },
    
    // Processing state
    processing: {
        isGenerating: false,
        currentStep: null,
        progress: 0,
        startTime: null,
        estimatedTimeRemaining: null
    },
    
    // UI state
    ui: {
        activeSection: 'upload',
        lastError: null,
        notifications: [],
        isDragOver: false
    },
    
    // History for undo functionality
    history: {
        alignmentSteps: [],
        maxSteps: CONFIG.UI.maxUndoHistory
    }
};

/**
 * State management utilities
 */
const StateManager = {
    /**
     * Reset the entire application state
     */
    reset: () => {
        state.referenceImage = null;
        state.cameraImage = null;
        state.lutMode = 'standard';
        state.analysisData = null;
        state.rangeData = null;
        state.visualization = { showHeatmap: true, showValues: true };
        
        StateManager.resetAlignment();
        StateManager.resetProcessing();
        StateManager.resetUI();
        StateManager.clearHistory();
        
        console.log('Application state reset');
    },
    
    /**
     * Reset alignment state
     */
    resetAlignment: () => {
        state.currentAlignment = {
            imageType: null,
            currentMarkerIndex: 0,
            isPlacing: false,
            markers: [],
            isComplete: false
        };
        
        state.alignments = {
            reference: { markers: [], gridCorners: [], isComplete: false, quality: null },
            camera: { markers: [], gridCorners: [], isComplete: false, quality: null }
        };
    },
    
    /**
     * Reset processing state
     */
    resetProcessing: () => {
        state.processing = {
            isGenerating: false,
            currentStep: null,
            progress: 0,
            startTime: null,
            estimatedTimeRemaining: null
        };
    },
    
    /**
     * Reset UI state
     */
    resetUI: () => {
        state.ui = {
            activeSection: 'upload',
            lastError: null,
            notifications: [],
            isDragOver: false
        };
    },
    
    /**
     * Clear history
     */
    clearHistory: () => {
        state.history = {
            alignmentSteps: [],
            maxSteps: CONFIG.UI.maxUndoHistory
        };
    },
    
    /**
     * Set current LUT mode
     */
    setLUTMode: (mode) => {
        if (!lutGenerator.algorithms[mode]) {
            throw new Error(`Invalid LUT mode: ${mode}`);
        }
        
        const previousMode = state.lutMode;
        state.lutMode = mode;
        
        console.log(`LUT mode changed from ${previousMode} to ${mode}`);
        
        // Trigger UI updates
        StateManager.notifyObservers('lutModeChanged', { previous: previousMode, current: mode });
    },
    
    /**
     * Set image data
     */
    setImage: (type, imageData) => {
        if (type !== 'reference' && type !== 'camera') {
            throw new Error(`Invalid image type: ${type}`);
        }
        
        state[`${type}Image`] = imageData;
        
        console.log(`${type} image set`);
        StateManager.notifyObservers('imageChanged', { type, imageData });
    },
    
    /**
     * Start alignment for an image
     */
    startAlignment: (imageType) => {
        if (!state[`${imageType}Image`]) {
            throw new Error(`No ${imageType} image loaded`);
        }
        
        state.currentAlignment = {
            imageType: imageType,
            currentMarkerIndex: 0,
            isPlacing: false,
            markers: [],
            isComplete: false
        };
        
        console.log(`Started alignment for ${imageType} image`);
        StateManager.notifyObservers('alignmentStarted', { imageType });
    },
    
    /**
     * Add a marker to the current alignment
     */
    addMarker: (marker) => {
        if (!state.currentAlignment.imageType) {
            throw new Error('No alignment in progress');
        }
        
        if (state.currentAlignment.markers.length >= 9) {
            throw new Error('All markers already placed');
        }
        
        // Add to history for undo
        StateManager.addToHistory('markerAdded', {
            marker: { ...marker },
            index: state.currentAlignment.currentMarkerIndex
        });
        
        state.currentAlignment.markers.push(marker);
        state.currentAlignment.currentMarkerIndex++;
        
        // Check if alignment is complete
        if (state.currentAlignment.markers.length === 9) {
            state.currentAlignment.isComplete = true;
            StateManager.notifyObservers('alignmentComplete', {
                imageType: state.currentAlignment.imageType,
                markers: state.currentAlignment.markers
            });
        }
        
        StateManager.notifyObservers('markerAdded', { marker, index: marker.index });
    },
    
    /**
     * Remove the last marker (undo)
     */
    removeLastMarker: () => {
        if (state.currentAlignment.markers.length === 0) {
            return null;
        }
        
        const removedMarker = state.currentAlignment.markers.pop();
        state.currentAlignment.currentMarkerIndex = state.currentAlignment.markers.length;
        state.currentAlignment.isComplete = false;
        
        StateManager.notifyObservers('markerRemoved', { marker: removedMarker });
        
        return removedMarker;
    },
    
    /**
     * Complete alignment for current image
     */
    completeAlignment: () => {
        if (!state.currentAlignment.isComplete) {
            throw new Error('Alignment not complete');
        }
        
        const imageType = state.currentAlignment.imageType;
        const alignment = {
            markers: [...state.currentAlignment.markers],
            isComplete: true,
            quality: null // Will be calculated separately
        };
        
        state.alignments[imageType] = alignment;
        
        // Reset current alignment
        state.currentAlignment = {
            imageType: null,
            currentMarkerIndex: 0,
            isPlacing: false,
            markers: [],
            isComplete: false
        };
        
        console.log(`Alignment completed for ${imageType} image`);
        StateManager.notifyObservers('alignmentSaved', { imageType, alignment });
    },
    
    /**
     * Set processing state
     */
    setProcessing: (isProcessing, step = null, progress = 0) => {
        const wasProcessing = state.processing.isGenerating;
        
        state.processing.isGenerating = isProcessing;
        state.processing.currentStep = step;
        state.processing.progress = progress;
        
        if (isProcessing && !wasProcessing) {
            state.processing.startTime = Date.now();
        } else if (!isProcessing && wasProcessing) {
            state.processing.startTime = null;
            state.processing.estimatedTimeRemaining = null;
        }
        
        StateManager.notifyObservers('processingChanged', {
            isProcessing,
            step,
            progress,
            startTime: state.processing.startTime
        });
    },
    
    /**
     * Update processing progress
     */
    updateProgress: (progress, step = null) => {
        const previousProgress = state.processing.progress;
        state.processing.progress = Math.max(0, Math.min(100, progress));
        
        if (step) {
            state.processing.currentStep = step;
        }
        
        // Calculate estimated time remaining
        if (state.processing.startTime && progress > 0) {
            const elapsed = Date.now() - state.processing.startTime;
            const estimatedTotal = (elapsed / progress) * 100;
            state.processing.estimatedTimeRemaining = estimatedTotal - elapsed;
        }
        
        StateManager.notifyObservers('progressUpdated', {
            progress: state.processing.progress,
            previousProgress,
            step: state.processing.currentStep,
            estimatedTimeRemaining: state.processing.estimatedTimeRemaining
        });
    },
    
    /**
     * Set analysis data
     */
    setAnalysisData: (analysisData) => {
        state.analysisData = analysisData;
        StateManager.notifyObservers('analysisDataChanged', { analysisData });
    },
    
    /**
     * Set range data
     */
    setRangeData: (rangeData) => {
        state.rangeData = rangeData;
        StateManager.notifyObservers('rangeDataChanged', { rangeData });
    },
    
    /**
     * Toggle visualization setting
     */
    toggleVisualization: (type) => {
        if (!state.visualization.hasOwnProperty(type)) {
            throw new Error(`Invalid visualization type: ${type}`);
        }
        
        const previousValue = state.visualization[type];
        state.visualization[type] = !previousValue;
        
        StateManager.notifyObservers('visualizationToggled', {
            type,
            value: state.visualization[type],
            previousValue
        });
    },
    
    /**
     * Add error to state
     */
    addError: (error, context = null) => {
        const errorInfo = {
            message: error.message || error,
            timestamp: Date.now(),
            context: context,
            stack: error.stack
        };
        
        state.ui.lastError = errorInfo;
        
        console.error('State error:', errorInfo);
        StateManager.notifyObservers('errorOccurred', errorInfo);
    },
    
    /**
     * Clear last error
     */
    clearError: () => {
        state.ui.lastError = null;
        StateManager.notifyObservers('errorCleared');
    },
    
    /**
     * Add action to history for undo functionality
     */
    addToHistory: (action, data) => {
        const historyItem = {
            action,
            data,
            timestamp: Date.now()
        };
        
        state.history.alignmentSteps.push(historyItem);
        
        // Limit history size
        if (state.history.alignmentSteps.length > state.history.maxSteps) {
            state.history.alignmentSteps.shift();
        }
    },
    
    /**
     * Get last history item without removing it
     */
    getLastHistoryItem: () => {
        const steps = state.history.alignmentSteps;
        return steps.length > 0 ? steps[steps.length - 1] : null;
    },
    
    /**
     * Remove last history item
     */
    removeLastHistoryItem: () => {
        return state.history.alignmentSteps.pop() || null;
    },
    
    /**
     * Check if both alignments are complete
     */
    areBothAlignmentsComplete: () => {
        return state.alignments.reference.isComplete && state.alignments.camera.isComplete;
    },
    
    /**
     * Check if ready to generate LUT
     */
    isReadyForGeneration: () => {
        return state.referenceImage &&
               state.cameraImage &&
               StateManager.areBothAlignmentsComplete() &&
               !state.processing.isGenerating;
    },
    
    /**
     * Get current state summary for debugging
     */
    getStateSummary: () => {
        return {
            hasReferenceImage: !!state.referenceImage,
            hasCameraImage: !!state.cameraImage,
            lutMode: state.lutMode,
            referenceAlignmentComplete: state.alignments.reference.isComplete,
            cameraAlignmentComplete: state.alignments.camera.isComplete,
            isProcessing: state.processing.isGenerating,
            progress: state.processing.progress,
            hasAnalysisData: !!state.analysisData,
            currentAlignment: state.currentAlignment.imageType,
            markersPlaced: state.currentAlignment.markers.length
        };
    },
    
    // Observer pattern for state changes
    observers: new Map(),
    
    /**
     * Subscribe to state changes
     */
    subscribe: (event, callback) => {
        if (!StateManager.observers.has(event)) {
            StateManager.observers.set(event, new Set());
        }
        StateManager.observers.get(event).add(callback);
        
        // Return unsubscribe function
        return () => {
            const callbacks = StateManager.observers.get(event);
            if (callbacks) {
                callbacks.delete(callback);
            }
        };
    },
    
    /**
     * Notify observers of state changes
     */
    notifyObservers: (event, data = null) => {
        const callbacks = StateManager.observers.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in state observer for ${event}:`, error);
                }
            });
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { state, StateManager };
}
