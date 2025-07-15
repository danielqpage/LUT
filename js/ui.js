/**
 * UI Management Module
 * Handles all user interface interactions and updates
 */

const ui = {
    /**
     * Show status message with appropriate styling
     * @param {string} message - Message to display
     * @param {string} type - Message type: 'success', 'error', 'warning', 'processing'
     * @param {number} duration - Auto-hide duration in ms (0 = don't auto-hide)
     */
    showStatus: (message, type, duration = 5000) => {
        const statusDiv = document.getElementById('statusMessage');
        if (!statusDiv) return;
        
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.style.display = 'block';
        
        // Auto-hide for success and error messages
        if ((type === 'success' || type === 'error') && duration > 0) {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, duration);
        }
        
        console.log(`Status [${type}]: ${message}`);
    },

    /**
     * Show alignment-specific status message
     * @param {string} message - Message to display
     * @param {string} type - Message type
     * @param {number} duration - Auto-hide duration in ms
     */
    showAlignmentStatus: (message, type, duration = 5000) => {
        const statusDiv = document.getElementById('alignmentStatusMessage');
        if (!statusDiv) return;
        
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.style.display = 'block';
        
        if ((type === 'success' || type === 'error') && duration > 0) {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, duration);
        }
    },

    /**
     * Update progress bar
     * @param {number} percent - Progress percentage (0-100)
     */
    updateProgress: (percent) => {
        const progressBar = document.getElementById('progressBar');
        const progressFill = document.getElementById('progressFill');
        
        if (!progressBar || !progressFill) return;
        
        progressBar.style.display = 'block';
        progressFill.style.width = Math.max(0, Math.min(100, percent)) + '%';
    },

    /**
     * Hide progress bar
     */
    hideProgress: () => {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            setTimeout(() => {
                progressBar.style.display = 'none';
            }, 500);
        }
    },

    /**
     * Update generate button state
     * @param {boolean} enabled - Whether button should be enabled
     */
    updateGenerateButton: (enabled) => {
        const btn = document.getElementById('generateBtn');
        if (!btn) return;
        
        const hasImages = state.referenceImage && state.cameraImage;
        const hasAlignments = state.alignments.reference.isComplete && state.alignments.camera.isComplete;
        const notProcessing = !state.processing.isGenerating;
        
        btn.disabled = !(enabled && hasImages && hasAlignments && notProcessing);
    },

    /**
     * Show/hide loading spinner on button
     * @param {string} buttonId - Button element ID
     * @param {boolean} show - Whether to show spinner
     */
    toggleButtonSpinner: (buttonId, show) => {
        const btn = document.getElementById(buttonId);
        if (!btn) return;
        
        const spinner = btn.querySelector('.loading-spinner');
        if (spinner) {
            spinner.style.display = show ? 'inline-block' : 'none';
        }
        
        btn.disabled = show;
    },

    /**
     * Update LUT mode UI
     * @param {string} mode - LUT mode ('standard', 'rangeAware', etc.)
     */
    updateLUTMode: (mode) => {
        // Update mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`${mode}Mode`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Update info cards
        document.querySelectorAll('.info-card').forEach(card => {
            card.style.display = 'none';
        });
        
        const infoCard = document.getElementById(`${mode}Info`);
        if (infoCard) {
            infoCard.style.display = 'block';
        }
        
        // Update generate button text
        const btnText = document.getElementById('generateBtnText');
        if (btnText) {
            const algorithmInfo = lutGenerator.algorithms[mode];
            if (algorithmInfo) {
                btnText.textContent = `Generate ${algorithmInfo.name}`;
            }
        }
    },

    /**
     * Update visualization toggle buttons
     * @param {string} type - Visualization type ('heatmap', 'values')
     * @param {boolean} active - Whether visualization is active
     */
    updateVisualizationToggle: (type, active) => {
        const toggleBtn = document.getElementById(`${type}Toggle`);
        if (toggleBtn) {
            toggleBtn.classList.toggle('active', active);
        }
    },

    /**
     * Show/hide sections based on current state
     * @param {string} section - Section to show ('upload', 'alignment', 'analysis', 'download')
     */
    showSection: (section) => {
        const sections = {
            upload: 'upload-section',
            alignment: 'alignmentSection',
            controls: 'controls',
            analysis: 'analysisSection',
            download: 'downloadSection'
        };
        
        if (sections[section]) {
            const element = document.getElementById(sections[section]);
            if (element) {
                element.style.display = element.style.display === 'none' ? 'block' : element.style.display;
            }
        }
    },

    /**
     * Hide a specific section
     * @param {string} section - Section to hide
     */
    hideSection: (section) => {
        const sections = {
            upload: 'upload-section',
            alignment: 'alignmentSection',
            controls: 'controls',
            analysis: 'analysisSection',
            download: 'downloadSection'
        };
        
        if (sections[section]) {
            const element = document.getElementById(sections[section]);
            if (element) {
                element.style.display = 'none';
            }
        }
    },

    /**
     * Update upload box state when image is loaded
     * @param {string} type - Image type ('reference' or 'camera')
     * @param {boolean} hasImage - Whether image is loaded
     */
    updateUploadBox: (type, hasImage) => {
        const uploadBox = document.getElementById(`${type}Upload`);
        const alignBtn = document.getElementById(`${type}AlignBtn`);
        
        if (uploadBox) {
            uploadBox.classList.toggle('has-image', hasImage);
        }
        
        if (alignBtn) {
            alignBtn.style.display = hasImage ? 'inline-block' : 'none';
        }
    },

    /**
     * Update marker progress display during alignment
     * @param {number} currentIndex - Currently active marker index
     * @param {Array} placedMarkers - Array of placed markers
     */
    updateMarkerProgress: (currentIndex, placedMarkers) => {
        for (let i = 0; i < CONFIG.MARKERS.length; i++) {
            const element = document.getElementById(`marker-${i}`);
            const coordsElement = element?.querySelector('.marker-coords');
            
            if (!element || !coordsElement) continue;
            
            if (i < placedMarkers.length) {
                // Marker placed
                element.className = 'marker-card placed';
                const marker = placedMarkers[i];
                coordsElement.textContent = `(${Math.round(marker.imageX)}, ${Math.round(marker.imageY)})`;
            } else if (i === currentIndex) {
                // Current marker
                element.className = 'marker-card current';
                coordsElement.textContent = 'Click to place';
            } else {
                // Waiting
                element.className = 'marker-card';
                coordsElement.textContent = 'Waiting...';
            }
        }
    },

    /**
     * Reset marker progress display
     */
    resetMarkerProgress: () => {
        for (let i = 0; i < CONFIG.MARKERS.length; i++) {
            const element = document.getElementById(`marker-${i}`);
            const coordsElement = element?.querySelector('.marker-coords');
            
            if (!element || !coordsElement) continue;
            
            if (i === 0) {
                element.className = 'marker-card current';
                coordsElement.textContent = 'Click to place';
            } else {
                element.className = 'marker-card';
                coordsElement.textContent = 'Waiting...';
            }
        }
    },

    /**
     * Update alignment controls based on current state
     * @param {Object} alignmentState - Current alignment state
     */
    updateAlignmentControls: (alignmentState) => {
        const startBtn = document.getElementById('startAlignBtn');
        const undoBtn = document.getElementById('undoBtn');
        const acceptBtn = document.getElementById('acceptAlignBtn');
        
        if (startBtn) {
            startBtn.disabled = !alignmentState.imageType || alignmentState.isPlacing;
        }
        
        if (undoBtn) {
            undoBtn.disabled = !alignmentState.isPlacing || alignmentState.markers.length === 0;
        }
        
        if (acceptBtn) {
            acceptBtn.disabled = !alignmentState.isComplete;
        }
    },

    /**
     * Update canvas title and instructions
     * @param {string} imageType - Type of image being aligned
     * @param {string} instruction - Current instruction text
     */
    updateCanvasInfo: (imageType, instruction) => {
        const titleElement = document.getElementById('canvasTitle');
        const instructionsElement = document.getElementById('canvasInstructions');
        
        if (titleElement && imageType) {
            const displayName = imageType === 'reference' ? 'Reference Chart' : 'Camera Capture';
            titleElement.textContent = `${displayName} Alignment`;
        }
        
        if (instructionsElement && instruction) {
            instructionsElement.textContent = instruction;
        }
    },

    /**
     * Show alignment score preview
     * @param {Object} quality - Quality assessment object
     */
    showAlignmentScore: (quality) => {
        const canvasContainer = document.querySelector('.canvas-container');
        if (!canvasContainer) return;
        
        // Remove existing score
        const existingScore = canvasContainer.querySelector('.alignment-score');
        if (existingScore) {
            existingScore.remove();
        }
        
        const score = quality.score;
        let scoreClass, scoreText;
        
        if (score >= 0.9) {
            scoreClass = 'score-excellent';
            scoreText = 'EXCELLENT';
        } else if (score >= 0.8) {
            scoreClass = 'score-good';
            scoreText = 'GOOD';
        } else if (score >= 0.7) {
            scoreClass = 'score-acceptable';
            scoreText = 'ACCEPTABLE';
        } else {
            scoreClass = 'score-poor';
            scoreText = 'NEEDS IMPROVEMENT';
        }
        
        const scoreDiv = document.createElement('div');
        scoreDiv.className = `alignment-score ${scoreClass}`;
        scoreDiv.innerHTML = `
            <div style="font-size: 1.2em; margin-bottom: 4px;">${scoreText}</div>
            <div style="font-size: 0.9em;">Quality Score: ${Math.round(score * 100)}%</div>
        `;
        
        canvasContainer.appendChild(scoreDiv);
    },

    /**
     * Update quality score display in analysis section
     * @param {string} scoreText - Score text to display
     */
    updateQualityScore: (scoreText) => {
        const scoreElement = document.getElementById('qualityScore');
        if (scoreElement) {
            scoreElement.textContent = scoreText;
        }
    },

    /**
     * Update range statistics display
     * @param {Object} rangeData - Range analysis data
     */
    updateRangeStats: (rangeData) => {
        const statsElement = document.getElementById('rangeStats');
        if (!statsElement || !rangeData) return;
        
        const { refRange, camRange, rangeRatio, luminanceOffset } = rangeData;
        
        const elements = {
            refRangeStat: `${refRange.robustMin.toFixed(2)} - ${refRange.robustMax.toFixed(2)}`,
            camRangeStat: `${camRange.robustMin.toFixed(2)} - ${camRange.robustMax.toFixed(2)}`,
            rangeRatioStat: `${rangeRatio.toFixed(2)}×`,
            offsetStat: `${luminanceOffset >= 0 ? '+' : ''}${luminanceOffset.toFixed(3)}`
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
        
        statsElement.style.display = 'grid';
    },

    /**
     * Hide range statistics
     */
    hideRangeStats: () => {
        const statsElement = document.getElementById('rangeStats');
        if (statsElement) {
            statsElement.style.display = 'none';
        }
    },

    /**
     * Create and show a notification toast
     * @param {string} message - Notification message
     * @param {string} type - Notification type ('info', 'success', 'warning', 'error')
     * @param {number} duration - Duration in ms (default: 4000)
     */
    showNotification: (message, type = 'info', duration = 4000) => {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            padding: 16px 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            border-left: 4px solid ${ui.getNotificationColor(type)};
        `;
        
        notification.innerHTML = `
            <div style="color: #374151; font-weight: 500;">${message}</div>
        `;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto-remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    },

    /**
     * Get notification color for type
     * @param {string} type - Notification type
     * @returns {string} Color hex value
     */
    getNotificationColor: (type) => {
        const colors = {
            info: '#3b82f6',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444'
        };
        return colors[type] || colors.info;
    },

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {Function} onConfirm - Callback for confirm
     * @param {Function} onCancel - Callback for cancel (optional)
     */
    showConfirmation: (message, onConfirm, onCancel = null) => {
        // Simple browser confirmation for now
        // In a full implementation, this could be a custom modal
        if (confirm(message)) {
            onConfirm();
        } else if (onCancel) {
            onCancel();
        }
    },

    /**
     * Set up download link
     * @param {string} content - File content
     * @param {string} filename - Filename
     * @param {string} mimeType - MIME type
     */
    setupDownload: (content, filename, mimeType = 'text/plain') => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const downloadBtn = document.getElementById('downloadBtn');
        
        if (downloadBtn) {
            downloadBtn.href = url;
            downloadBtn.download = filename;
            
            // Clean up URL after download
            downloadBtn.addEventListener('click', () => {
                setTimeout(() => URL.revokeObjectURL(url), 100);
            }, { once: true });
        }
        
        return url;
    },

    /**
     * Trigger file download
     * @param {string} content - File content
     * @param {string} filename - Filename
     * @param {string} mimeType - MIME type
     */
    downloadFile: (content, filename, mimeType = 'text/plain') => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
    },

    /**
     * Animate element with CSS classes
     * @param {string|Element} element - Element or selector
     * @param {string} animationClass - CSS class for animation
     * @param {number} duration - Animation duration in ms
     */
    animateElement: (element, animationClass, duration = 300) => {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return;
        
        el.classList.add(animationClass);
        
        setTimeout(() => {
            el.classList.remove(animationClass);
        }, duration);
    },

    /**
     * Scroll element into view smoothly
     * @param {string|Element} element - Element or selector
     * @param {Object} options - Scroll options
     */
    scrollToElement: (element, options = {}) => {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return;
        
        el.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            ...options
        });
    },

    /**
     * Get current theme preference
     * @returns {string} Theme name ('light' or 'dark')
     */
    getTheme: () => {
        return localStorage.getItem('lut-generator-theme') || 'light';
    },

    /**
     * Set theme preference
     * @param {string} theme - Theme name
     */
    setTheme: (theme) => {
        localStorage.setItem('lut-generator-theme', theme);
        document.body.setAttribute('data-theme', theme);
    },

    /**
     * Initialize UI event listeners
     */
    initializeEventListeners: () => {
        // Subscribe to state changes
        StateManager.subscribe('imageChanged', (data) => {
            ui.updateUploadBox(data.type, !!data.imageData);
            ui.updateGenerateButton(true);
        });
        
        StateManager.subscribe('lutModeChanged', (data) => {
            ui.updateLUTMode(data.current);
        });
        
        StateManager.subscribe('visualizationToggled', (data) => {
            ui.updateVisualizationToggle(data.type, data.value);
        });
        
        StateManager.subscribe('processingChanged', (data) => {
            ui.toggleButtonSpinner('generateBtn', data.isProcessing);
        });
        
        StateManager.subscribe('progressUpdated', (data) => {
            ui.updateProgress(data.progress);
        });
        
        StateManager.subscribe('errorOccurred', (data) => {
            ui.showStatus(data.message, 'error');
        });
        
        StateManager.subscribe('alignmentStarted', (data) => {
            ui.showSection('alignment');
            ui.scrollToElement('#alignmentSection');
        });
        
        StateManager.subscribe('markerAdded', (data) => {
            ui.updateMarkerProgress(state.currentAlignment.currentMarkerIndex, state.currentAlignment.markers);
        });
        
        StateManager.subscribe('markerRemoved', () => {
            ui.updateMarkerProgress(state.currentAlignment.currentMarkerIndex, state.currentAlignment.markers);
        });
        
        StateManager.subscribe('alignmentComplete', (data) => {
            ui.updateAlignmentControls(state.currentAlignment);
        });
        
        StateManager.subscribe('alignmentSaved', (data) => {
            ui.hideSection('alignment');
            ui.updateGenerateButton(true);
            ui.showNotification(`${data.imageType} alignment saved successfully!`, 'success');
        });
        
        console.log('UI event listeners initialized');
    },

    /**
     * Cleanup UI resources
     */
    cleanup: () => {
        // Remove any temporary URLs
        document.querySelectorAll('a[href^="blob:"]').forEach(link => {
            URL.revokeObjectURL(link.href);
        });
        
        // Clear notifications
        document.querySelectorAll('.notification').forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ui;
}