# Professional Color Chart LUT Generator v3.0

A modular, professional-grade web application for generating 3D LUTs from color chart calibration images. Features advanced 9-point alignment, multiple LUT algorithms, and comprehensive quality analysis.

## 🚀 Features

- **9-Point Crosshair Alignment**: Precise manual alignment with zoom assistance
- **Multiple LUT Algorithms**: Standard, Range-Aware, Tetrahedral, and Perceptual modes
- **Dynamic Range Analysis**: Intelligent luminance mapping for optimal results
- **Quality Assessment**: Real-time patch consistency analysis with outlier detection
- **Professional Export**: Industry-standard .cube format with comprehensive metadata
- **Comprehensive Analysis**: CSV exports and quality reports
- **Modular Architecture**: Easy to extend and maintain

## 📁 Project Structure

```
lut-generator/
├── index.html              # Main HTML structure
├── styles.css              # Application styles
├── js/
│   ├── config.js           # Configuration constants
│   ├── state.js            # State management
│   ├── utils.js            # Utility functions
│   ├── ui.js               # UI management
│   ├── imageProcessor.js   # Image processing
│   ├── alignment.js        # 9-point alignment
│   ├── lutGenerator.js     # LUT algorithms
│   ├── rangeAnalyzer.js    # Range analysis
│   ├── visualization.js    # Data visualization
│   ├── exporter.js         # File export
│   └── main.js             # Main application logic
└── README.md               # Project documentation
```

## 🏗️ Architecture Overview

### Modular Design
The application is built with a clean modular architecture where each module has a specific responsibility:

- **Config Module**: Central configuration and constants
- **State Manager**: Centralized state management with observer pattern
- **Utils**: Reusable utility functions for colors, math, and validation
- **UI Manager**: User interface interactions and updates
- **Image Processor**: Image loading, processing, and color extraction
- **Alignment Module**: 9-point crosshair alignment functionality
- **LUT Generator**: Multiple LUT generation algorithms
- **Range Analyzer**: Dynamic range analysis and mapping
- **Visualization**: Quality overlays and data visualization
- **Exporter**: File generation (.cube, CSV, JSON, HTML reports)

### State Management
Centralized state management using the observer pattern:

```javascript
// Subscribe to state changes
StateManager.subscribe('imageChanged', (data) => {
    console.log('Image loaded:', data.type);
});

// Update state
StateManager.setImage('reference', imageData);
```

### Configuration System
Centralized configuration in `config.js`:

```javascript
const CONFIG = {
    GRID: { rows: 7, cols: 15, sampleSize: 50 },
    QUALITY: { excellent: 0.05, good: 0.15 },
    COLORS: { excellent: '#22c55e', good: '#f59e0b', poor: '#ef4444' }
};
```

## 🔧 Adding New LUT Algorithms

The modular design makes it easy to add new LUT generation algorithms:

1. **Add Algorithm to Registry** (`js/lutGenerator.js`):

```javascript
lutGenerator.algorithms.myNewAlgorithm = {
    name: 'My New Algorithm',
    description: 'Advanced color mapping technique',
    generate: (refColors, camColors, lutSize, options = {}) => {
        // Your algorithm implementation
        return lutData;
    }
};
```

2. **Add UI Configuration** (`index.html`):

```html
<button class="mode-btn" id="myNewMode" onclick="setLUTMode('myNewAlgorithm')">
    My New Algorithm
</button>
```

3. **Add Info Card**:

```html
<div class="info-card" id="myNewInfo" style="display: none;">
    <h4>🔬 My New Algorithm</h4>
    <p>Description of your new algorithm...</p>
</div>
```

## 🎨 Customizing Visualizations

Add new visualization types in `js/visualization.js`:

```javascript
visualization.drawCustomOverlay = (ctx, data, options) => {
    // Your custom visualization
};
```

## 📊 Data Flow

1. **Image Upload** → `imageProcessor.loadImage()`
2. **Alignment** → `alignmentModule.startAlignment()`
3. **Color Extraction** → `imageProcessor.extractColorPatches()`
4. **Range Analysis** → `rangeAnalyzer.analyzeLuminanceRange()`
5. **LUT Generation** → `lutGenerator.generateWithAlgorithm()`
6. **Export** → `exporter.generateCubeFile()`

## 🔍 Quality Assessment

The application provides comprehensive quality assessment:

- **Coefficient of Variation (CV)**: Measures patch consistency
- **Outlier Detection**: Uses Median Absolute Deviation (MAD)
- **Range Compatibility**: Analyzes luminance range differences
- **Grid Regularity**: Validates alignment accuracy

Quality thresholds can be configured in `CONFIG.QUALITY`:

```javascript
QUALITY: {
    excellent: 0.05,    // CV < 5%
    good: 0.15,         // CV < 15%
    outlierThreshold: 2.0,
    minSamples: 3
}
```

## 🎯 Alignment System

The 9-point alignment system provides:

- **Precise Positioning**: Sub-pixel accuracy with zoom assistance
- **Quality Scoring**: Automatic assessment of grid regularity
- **Undo/Redo**: Full marker placement history
- **Visual Feedback**: Real-time grid overlay

## 🚀 Usage

1. **Upload Images**: Load reference color chart and camera capture
2. **Align Charts**: Use 9-point alignment for both images
3. **Configure LUT**: Choose algorithm and resolution
4. **Generate**: Create professional .cube LUT file
5. **Analyze**: Review quality metrics and export reports

## 🛠️ Browser Compatibility

- Modern browsers with Canvas support
- FileReader API for image loading
- No external dependencies (self-contained)

## 📝 Export Formats

- **.cube**: Industry-standard 3D LUT format
- **.csv**: Detailed analysis data
- **.json**: Project and alignment data
- **.html**: Quality reports

## 🔬 Algorithm Details

### Standard Color Matching
Direct color-to-color mapping with inverse distance weighting.

### Dynamic Range Optimization
Analyzes luminance ranges and applies intelligent remapping for optimal display utilization.

### Tetrahedral Interpolation
Advanced interpolation using tetrahedral decomposition for improved accuracy.

### Perceptual Lab Space
Works in perceptually uniform Lab color space for more natural color transitions.

## 🎛️ Configuration Options

Key configuration parameters:

```javascript
CONFIG = {
    GRID: {
        rows: 7,                // Grid rows
        cols: 15,               // Grid columns
        sampleSize: 50,         // Patch sample size
        subSampleGrid: 3        // Sub-sampling density
    },
    QUALITY: {
        excellent: 0.05,        // Excellent CV threshold
        good: 0.15,             // Good CV threshold
        outlierThreshold: 2.0,  // Outlier detection sensitivity
        minSamples: 3           // Minimum samples for robust averaging
    },
    LUT: {
        defaultSize: 33,        // Default LUT resolution
        availableSizes: [17, 33, 65]  // Available resolutions
    }
};
```

## 🧪 Testing

The modular architecture supports easy testing:

```javascript
// Test utility functions
console.assert(utils.clamp(1.5) === 1.0);
console.assert(utils.colorDistance([1,0,0], [0,0,0]) > 0);

// Test LUT generation
const testLUT = lutGenerator.create3DLUT(refColors, camColors, 17);
console.assert(testLUT.length === 17 * 17 * 17);
```

## 📈 Performance

- **Optimized Processing**: Efficient color sampling and interpolation
- **Progressive Enhancement**: Non-blocking UI updates
- **Memory Management**: Automatic cleanup of temporary resources
- **Scalable**: Handles large images and high-resolution LUTs

## 🎉 Getting Started

1. Open `index.html` in a modern web browser
2. Upload your reference color chart image
3. Upload your camera capture of the same chart
4. Align both images using the 9-point system
5. Choose your LUT algorithm and generate

## 🔧 Extending the Application

The modular design allows for easy extension:

- Add new color spaces
- Implement additional quality metrics
- Create custom export formats
- Integrate with external APIs
- Add batch processing capabilities

## 📄 License

Professional Color Chart LUT Generator v3.0 - Built for professional color calibration workflows.

---

*For technical support or feature requests, please refer to the inline documentation and comments within each module.*