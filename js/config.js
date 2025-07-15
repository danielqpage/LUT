/**
 * Configuration Constants
 * Central location for all application configuration
 */

const CONFIG = {
    // Grid configuration for color chart
    GRID: {
        rows: 7,
        cols: 15,
        sampleSize: 50,           // Size of sampling area for each patch
        subSampleGrid: 3          // Sub-sampling grid within each patch
    },

    // Marker definitions for 9-point calibration
    MARKERS: [
        { name: 'Top-Left', shape: 'crosshair', symbol: '✚', gridPos: [0, 0] },
        { name: 'Top-Center', shape: 'crosshair', symbol: '✚', gridPos: [0, 7] },
        { name: 'Top-Right', shape: 'crosshair', symbol: '✚', gridPos: [0, 14] },
        { name: 'Mid-Left', shape: 'crosshair', symbol: '✚', gridPos: [3, 0] },
        { name: 'Mid-Center', shape: 'crosshair', symbol: '✚', gridPos: [3, 7] },
        { name: 'Mid-Right', shape: 'crosshair', symbol: '✚', gridPos: [3, 14] },
        { name: 'Bot-Left', shape: 'crosshair', symbol: '✚', gridPos: [6, 0] },
        { name: 'Bot-Center', shape: 'crosshair', symbol: '✚', gridPos: [6, 7] },
        { name: 'Bot-Right', shape: 'crosshair', symbol: '✚', gridPos: [6, 14] }
    ],

    // Quality assessment thresholds
    QUALITY: {
        excellent: 0.05,          // CV < 5% = excellent consistency
        good: 0.15,               // CV < 15% = good consistency
        outlierThreshold: 2.0,    // Outlier detection threshold (MAD units)
        minSamples: 3             // Minimum samples required for robust averaging
    },

    // Color scheme for visualizations
    COLORS: {
        excellent: '#22c55e',     // Green for excellent quality
        good: '#f59e0b',          // Orange for good quality
        poor: '#ef4444',          // Red for poor quality
        markerBorder: '#fbbf24',  // Yellow for marker borders
        gridLine: '#3b82f6',      // Blue for grid lines
        background: '#f8fafc'     // Light gray background
    },

    // Canvas and visualization settings
    CANVAS: {
        maxWidth: 800,            // Maximum canvas width
        maxHeight: 600,           // Maximum canvas height
        zoomSize: 180,            // Zoom overlay size
        zoomMagnification: 2,     // Zoom magnification factor
        markerRadius: 20,         // Marker circle radius
        gridLineWidth: 1,         // Grid line thickness
        markerLineWidth: 3        // Marker line thickness
    },

    // LUT generation settings
    LUT: {
        defaultSize: 33,          // Default LUT resolution
        availableSizes: [17, 33, 65], // Available LUT sizes
        interpolationNeighbors: 4, // Number of neighbors for interpolation
        maxFileSize: 10 * 1024 * 1024, // 10MB max file size
        supportedFormats: ['image/jpeg', 'image/png', 'image/tiff']
    },

    // Algorithm-specific settings
    ALGORITHMS: {
        standard: {
            colorWeight: 1.0,
            luminanceWeight: 0.0
        },
        rangeAware: {
            colorWeight: 1.0,
            luminanceWeight: 2.0,
            robustPercentile: 0.05  // Use 5th/95th percentile for robust range
        },
        tetrahedral: {
            subdivisionDepth: 3,
            adaptiveThreshold: 0.01
        },
        perceptual: {
            labWeights: [1.0, 1.0, 1.0], // L, a, b weights
            chromaBoost: 1.2
        }
    },

    // UI interaction settings
    UI: {
        animationDuration: 300,   // Animation duration in ms
        toastDuration: 5000,      // Toast message duration
        progressUpdateInterval: 100, // Progress bar update interval
        debounceDelay: 250,       // Input debounce delay
        maxUndoHistory: 10        // Maximum undo history
    },

    // File handling
    FILES: {
        maxSize: 50 * 1024 * 1024, // 50MB max file size
        allowedTypes: [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/tiff',
            'image/tif',
            'image/bmp',
            'image/webp'
        ],
        defaultOutputName: 'color_calibration',
        outputExtension: '.cube'
    },

    // Error messages
    ERRORS: {
        fileTooBig: 'File size exceeds maximum limit of 50MB',
        invalidFileType: 'Please select a valid image file (JPEG, PNG, TIFF, BMP, WebP)',
        alignmentIncomplete: 'Please complete alignment for both images before generating LUT',
        insufficientMarkers: 'At least 9 calibration markers are required',
        processingError: 'An error occurred during processing. Please try again.',
        networkError: 'Network error. Please check your connection and try again.',
        browserNotSupported: 'Your browser does not support required features'
    },

    // Success messages
    SUCCESS: {
        imageLoaded: 'Image loaded successfully',
        alignmentComplete: 'Alignment completed successfully',
        lutGenerated: 'LUT generated successfully',
        fileExported: 'Analysis exported successfully'
    },

    // Keyboard shortcuts
    SHORTCUTS: {
        generateLUT: 'Ctrl+G',
        exportAnalysis: 'Ctrl+E',
        resetAlignment: 'Ctrl+R',
        undoMarker: 'Ctrl+Z',
        toggleVisualization: 'Ctrl+V'
    },

    // Feature flags for experimental features
    FEATURES: {
        tetrahedralInterpolation: true,
        perceptualColorSpace: true,
        advancedRangeAnalysis: true,
        realTimePreview: false,
        gpuAcceleration: false,
        batchProcessing: false,
        cloudSync: false
    },

    // Performance settings
    PERFORMANCE: {
        maxConcurrentProcessing: 1,
        workerThreads: navigator.hardwareConcurrency || 4,
        chunkSize: 1000,          // Processing chunk size
        memoryLimit: 512 * 1024 * 1024, // 512MB memory limit
        timeoutDuration: 30000    // 30 second timeout
    },

    // Debug settings
    DEBUG: {
        enabled: false,           // Enable debug mode
        verboseLogging: false,    // Enable verbose logging
        showPerformanceMetrics: false,
        validateInputs: true,     // Validate all inputs
        strictMode: false         // Enable strict error handling
    },

    // Version information
    VERSION: {
        major: 3,
        minor: 0,
        patch: 0,
        build: 'release',
        date: '2024-01-15'
    }
};

// Freeze configuration to prevent accidental modification
Object.freeze(CONFIG);

// Export for use in other modules (if using ES6 modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}