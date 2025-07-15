/**
 * Main Application Logic
 * Entry point and event coordination for the LUT Generator
 */

// Main application state and lifecycle management
const App = {
    /**
     * Initialize the application
     */
    init: () => {
        console.log(`LUT Generator v${CONFIG.VERSION.major}.${CONFIG.VERSION.minor}.${CONFIG.VERSION.patch} initializing...`);
        
        App.setupEventListeners();
        App.setupDragAndDrop();
        App.setupKeyboardShortcuts();
        App.validateBrowserSupport();
        App.initializeUI();
        
        console.log('Application initialized successfully');
    },

    /**
     * Setup all event listeners
     */
    setupEventListeners: () => {
        // File upload handlers
        document.getElementById('referenceFile').addEventListener('change', (e) => App.handleFileUpload(e, 'reference'));
        document.getElementById('cameraFile').addEventListener('change', (e) => App.handleFileUpload(e, 'camera'));
        
        // Mode selection
        document.getElementById('standardMode').addEventListener('click', () => App.setLUTMode('standard'));
        document.getElementById('rangeAwareMode').addEventListener('click', () => App.setLUTMode('rangeAware'));
        
        // LUT generation
        document.getElementById('generateBtn').addEventListener('click', App.generateLUT);
        
        // Visualization toggles
        document.getElementById('heatmapToggle').addEventListener('click', () => App.toggleVisualization('heatmap'));
        document.getElementById('valuesToggle').addEventListener('click', () => App.toggleVisualization('values'));
        
        // Export functionality
        document.querySelector('.export-btn').addEventListener('click', App.exportAnalysis);
        
        // Alignment controls
        document.getElementById('startAlignBtn').addEventListener('click', App.startPlacingMarkers);
        document.getElementById('undoBtn').addEventListener('click', App.undoLastMarker);
        document.getElementById('resetBtn')?.addEventListener('click', App.resetAlignment);
        document.getElementById('acceptAlignBtn').addEventListener('click', App.acceptAlignment);
        
        // Window events
        window.addEventListener('error', App.handleGlobalError);
        window.addEventListener('unhandledrejection', App.handleUnhandledRejection);
        window.addEventListener('beforeunload', App.handleBeforeUnload);
    },

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop: () => {
        App.enableDragAndDrop('referenceUpload', 'referenceFile');
        App.enableDragAndDrop('cameraUpload', 'cameraFile');
    },

    /**
     * Enable drag and drop for a specific upload box
     */
    enableDragAndDrop: (boxId, inputId) => {
        const box = document.getElementById(boxId);
        const input = document.getElementById(inputId);
        
        if (!box || !input) return;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            box.addEventListener(eventName, App.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            box.addEventListener(eventName, () => box.classList.add('dragover'), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            box.addEventListener(eventName, () => box.classList.remove('dragover'), false);
        });
        
        box.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                input.files = files;
                input.dispatchEvent(new Event('change'));
            }
        }, false);
    },

    /**
     * Prevent default drag behaviors
     */
    preventDefaults: (e) => {
        e.preventDefault();
        e.stopPropagation();
    },

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts: () => {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts if not typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;
            
            if (isCtrlOrCmd) {
                switch (e.key.toLowerCase()) {
                    case 'g':
                        e.preventDefault();
                        if (!document.getElementById('generateBtn').disabled) {
                            App.generateLUT();
                        }
                        break;
                    case 'e':
                        e.preventDefault();
                        if (state.analysisData) {
                            App.exportAnalysis();
                        }
                        break;
                    case 'r':
                        e.preventDefault();
                        App.resetAlignment();
                        break;
                    case 'z':
                        e.preventDefault();
                        App.undoLastMarker();
                        break;
                    case 'v':
                        e.preventDefault();
                        App.toggleVisualization('heatmap');
                        break;
                }
            }
            
            // ESC key to cancel current operation
            if (e.key === 'Escape') {
                App.cancelCurrentOperation();
            }
        });
    },

    /**
     * Validate browser support for required features
     */
    validateBrowserSupport: () => {
        const requiredFeatures = [
            'FileReader',
            'Canvas',
            'Blob',
            'URL.createObjectURL'
        ];
        
        const missingFeatures = requiredFeatures.filter(feature => {
            switch (feature) {
                case 'FileReader':
                    return !window.FileReader;
                case 'Canvas':
                    return !document.createElement('canvas').getContext;
                case 'Blob':
                    return !window.Blob;
                case 'URL.createObjectURL':
                    return !window.URL || !window.URL.createObjectURL;
                default:
                    return false;
            }
        });
        
        if (missingFeatures.length > 0) {
            ui.showStatus(CONFIG.ERRORS.browserNotSupported, 'error');
            console.error('Missing browser features:', missingFeatures);
        }
    },

    /**
     * Initialize UI state
     */
    initializeUI: () => {
        // Set default LUT mode
        App.setLUTMode('standard');
        
        // Initialize progress bar
        ui.hideProgress();
        
        // Set default filename
        const now = new Date();
        const defaultName = `${CONFIG.FILES.defaultOutputName}_${now.toISOString().slice(0, 10)}`;
        document.getElementById('fileName').value = defaultName;
        
        // Update generate button state
        ui.updateGenerateButton(false);
    },

    /**
     * Handle file upload events
     */
    handleFileUpload: async (event, type) => {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file
        const validation = App.validateFile(file);
        if (!validation.valid) {
            ui.showStatus(validation.error, 'error');
            return;
        }
        
        try {
            ui.showStatus(`Loading ${type} image...`, 'processing');
            
            const imageData = await imageProcessor.loadImage(
                file, 
                type === 'reference' ? 'referencePreview' : 'cameraPreview',
                type
            );
            
            // Store image data
            if (type === 'reference') {
                state.referenceImage = imageData;
            } else {
                state.cameraImage = imageData;
            }
            
            ui.showStatus(CONFIG.SUCCESS.imageLoaded, 'success');
            ui.updateGenerateButton(state.referenceImage && state.cameraImage);
            
        } catch (error) {
            console.error(`Error loading ${type} image:`, error);
            ui.showStatus(`Error loading ${type} image: ${error.message}`, 'error');
        }
    },

    /**
     * Validate uploaded file
     */
    validateFile: (file) => {
        if (file.size > CONFIG.FILES.maxSize) {
            return { valid: false, error: CONFIG.ERRORS.fileTooBig };
        }
        
        if (!CONFIG.FILES.allowedTypes.includes(file.type)) {
            return { valid: false, error: CONFIG.ERRORS.invalidFileType };
        }
        
        return { valid: true };
    },

    /**
     * Set LUT generation mode
     */
    setLUTMode: (mode) => {
        state.lutMode = mode;
        
        // Update UI
        document.getElementById('standardMode').classList.toggle('active', mode === 'standard');
        document.getElementById('rangeAwareMode').classList.toggle('active', mode === 'rangeAware');
        document.getElementById('standardInfo').style.display = mode === 'standard' ? 'block' : 'none';
        document.getElementById('rangeInfo').style.display = mode === 'rangeAware' ? 'block' : 'none';
        
        // Update button text
        const btnText = document.getElementById('generateBtnText');
        btnText.textContent = mode === 'rangeAware' ? 'Generate Dynamic Range LUT' : 'Generate Color LUT';
        
        console.log(`LUT mode set to: ${mode}`);
    },

    /**
     * Generate LUT with current settings
     */
    generateLUT: async () => {
        // Validate prerequisites
        if (!state.alignments.reference.isComplete || !state.alignments.camera.isComplete) {
            ui.showStatus(CONFIG.ERRORS.alignmentIncomplete, 'error');
            return;
        }

        const lutSize = parseInt(document.getElementById('lutSize').value);
        const fileName = document.getElementById('fileName').value || CONFIG.FILES.defaultOutputName;
        
        // Disable button and show spinner
        const btn = document.getElementById('generateBtn');
        const spinner = btn.querySelector('.loading-spinner');
        btn.disabled = true;
        spinner.style.display = 'inline-block';
        
        try {
            console.log(`Starting LUT generation: ${state.lutMode} mode, ${lutSize}³ resolution`);
            
            // Extract patches using alignment data
            ui.showStatus('Analyzing color patches with aligned grid...', 'processing');
            ui.updateProgress(10);
            
            const refResult = imageProcessor.extractColorPatches(state.referenceImage, state.alignments.reference);
            const camResult = imageProcessor.extractColorPatches(state.cameraImage, state.alignments.camera);
            
            console.log(`Extracted ${refResult.patches.length} color patches (${refResult.skippedIndices.length} markers skipped)`);
            
            ui.updateProgress(30);
            
            // Store analysis data
            state.analysisData = {
                referencePatches: refResult.patches,
                cameraPatches: camResult.patches,
                referenceQuality: refResult.qualityScores,
                cameraQuality: camResult.qualityScores,
                skippedIndices: refResult.skippedIndices
            };
            
            ui.updateProgress(40);
            
            // Range analysis if needed
            if (state.lutMode === 'rangeAware') {
                ui.showStatus('Performing dynamic range analysis...', 'processing');
                
                const refRange = rangeAnalyzer.analyzeLuminanceRange(refResult.patches);
                const camRange = rangeAnalyzer.analyzeLuminanceRange(camResult.patches);
                state.rangeData = rangeAnalyzer.calculateRangeMapping(refRange, camRange);
                
                state.analysisData.rangeData = state.rangeData;
            }
            
            ui.updateProgress(50);
            
            // Generate LUT using algorithm registry
            ui.showStatus(`Generating ${lutSize}×${lutSize}×${lutSize} 3D LUT...`, 'processing');
            
            await new Promise(resolve => setTimeout(resolve, 10)); // Allow UI update
            
            const options = state.lutMode === 'rangeAware' ? { rangeData: state.rangeData } : {};
            const lutData = lutGenerator.generateWithAlgorithm(
                state.lutMode,
                refResult.patches,
                camResult.patches,
                lutSize,
                options
            );
            
            ui.updateProgress(80);
            
            // Create cube file
            ui.showStatus('Creating .cube file...', 'processing');
            
            const cubeContent = exporter.generateCubeFile(lutData, lutSize, {
                referenceColors: refResult.patches,
                cameraColors: camResult.patches,
                mode: state.lutMode,
                rangeData: state.rangeData
            });
            
            ui.updateProgress(90);
            
            // Setup download
            const blob = new Blob([cubeContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const downloadBtn = document.getElementById('downloadBtn');
            downloadBtn.href = url;
            downloadBtn.download = `${fileName}${state.lutMode === 'rangeAware' ? '_range_optimized' : ''}${CONFIG.FILES.outputExtension}`;
            
            // Show analysis and visualizations
            App.showAnalysisResults();
            
            ui.showStatus(CONFIG.SUCCESS.lutGenerated, 'success');
            ui.updateProgress(100);
            ui.hideProgress();
            
            console.log('LUT generation completed successfully');
            
        } catch (error) {
            console.error('LUT generation error:', error);
            ui.showStatus(`Error: ${error.message}`, 'error');
            ui.hideProgress();
        } finally {
            // Re-enable button and hide spinner
            btn.disabled = false;
            spinner.style.display = 'none';
        }
    },

    /**
     * Show analysis results and visualizations
     */
    showAnalysisResults: () => {
        if (!state.analysisData) return;
        
        const { referenceQuality, cameraQuality } = state.analysisData;
        
        // Show analysis section
        document.getElementById('analysisSection').style.display = 'block';
        
        // Draw visualizations
        visualization.drawAnalysis('refCanvas', state.referenceImage, referenceQuality, state.alignments.reference);
        visualization.drawAnalysis('camCanvas', state.cameraImage, cameraQuality, state.alignments.camera);
        
        // Update quality scores
        const { refStats, camStats, overallScore } = visualization.updateQualityScore(referenceQuality, cameraQuality);
        
        // Show range stats if applicable
        if (state.lutMode === 'rangeAware' && state.rangeData) {
            visualization.updateRangeStats(state.rangeData);
        } else {
            document.getElementById('rangeStats').style.display = 'none';
        }
        
        // Show download section
        document.getElementById('downloadSection').style.display = 'block';
        
        console.log('Analysis results displayed');
    },

    /**
     * Toggle visualization display
     */
    toggleVisualization: (type) => {
        if (type === 'heatmap') {
            state.visualization.showHeatmap = !state.visualization.showHeatmap;
            document.getElementById('heatmapToggle').classList.toggle('active', state.visualization.showHeatmap);
        } else if (type === 'values') {
            state.visualization.showValues = !state.visualization.showValues;
            document.getElementById('valuesToggle').classList.toggle('active', state.visualization.showValues);
        }
        
        // Redraw if we have data
        if (state.analysisData) {
            const { referenceQuality, cameraQuality } = state.analysisData;
            visualization.drawAnalysis('refCanvas', state.referenceImage, referenceQuality, state.alignments.reference);
            visualization.drawAnalysis('camCanvas', state.cameraImage, cameraQuality, state.alignments.camera);
        }
    },

    /**
     * Export analysis data as CSV
     */
    exportAnalysis: () => {
        if (!state.analysisData) {
            ui.showStatus('No analysis data available to export', 'warning');
            return;
        }
        
        try {
            const csv = exporter.exportAnalysisCSV(state.analysisData);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `color_analysis_${state.lutMode}_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            ui.showStatus(CONFIG.SUCCESS.fileExported, 'success');
            console.log('Analysis data exported successfully');
            
        } catch (error) {
            console.error('Export error:', error);
            ui.showStatus(`Export failed: ${error.message}`, 'error');
        }
    },

    /**
     * Start placing alignment markers
     */
    startPlacingMarkers: () => {
        alignmentModule.startPlacingMarkers();
    },

    /**
     * Undo last placed marker
     */
    undoLastMarker: () => {
        alignmentModule.undoLastMarker();
    },

    /**
     * Reset current alignment
     */
    resetAlignment: () => {
        alignmentModule.resetAlignment();
    },

    /**
     * Accept current alignment
     */
    acceptAlignment: () => {
        alignmentModule.acceptAlignment();
    },

    /**
     * Cancel current operation
     */
    cancelCurrentOperation: () => {
        // Cancel alignment if in progress
        if (state.currentAlignment && state.currentAlignment.isPlacing) {
            App.resetAlignment();
        }
        
        // Hide any open modals or overlays
        alignmentModule.hideZoomOverlay();
    },

    /**
     * Handle global errors
     */
    handleGlobalError: (event) => {
        console.error('Global error:', event.error);
        ui.showStatus(CONFIG.ERRORS.processingError, 'error');
        
        // Reset application state if needed
        App.resetToSafeState();
    },

    /**
     * Handle unhandled promise rejections
     */
    handleUnhandledRejection: (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        ui.showStatus(CONFIG.ERRORS.processingError, 'error');
    },

    /**
     * Handle before unload (warn about unsaved work)
     */
    handleBeforeUnload: (event) => {
        if (state.currentAlignment && state.currentAlignment.isPlacing) {
            event.preventDefault();
            event.returnValue = 'You have unsaved alignment work. Are you sure you want to leave?';
            return event.returnValue;
        }
    },

    /**
     * Reset application to a safe state after error
     */
    resetToSafeState: () => {
        try {
            // Reset alignment state
            if (state.currentAlignment) {
                state.currentAlignment.isPlacing = false;
            }
            
            // Hide progress indicators
            ui.hideProgress();
            
            // Re-enable buttons
            document.getElementById('generateBtn').disabled = false;
            
            // Hide spinners
            document.querySelectorAll('.loading-spinner').forEach(spinner => {
                spinner.style.display = 'none';
            });
            
            console.log('Application reset to safe state');
        } catch (error) {
            console.error('Error during safe state reset:', error);
        }
    }
};

// Global functions for HTML onclick handlers (maintain backward compatibility)
window.startAlignment = (imageType) => alignmentModule.startAlignment(imageType);
window.startPlacingMarkers = () => App.startPlacingMarkers();
window.undoLastMarker = () => App.undoLastMarker();
window.resetAlignment = () => App.resetAlignment();
window.acceptAlignment = () => App.acceptAlignment();
window.setLUTMode = (mode) => App.setLUTMode(mode);
window.generateLUT = () => App.generateLUT();
window.toggleVisualization = (type) => App.toggleVisualization(type);
window.exportAnalysis = () => App.exportAnalysis();

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);

// Export App for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}