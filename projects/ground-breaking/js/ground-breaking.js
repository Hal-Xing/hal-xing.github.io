class ImageScroller {
    constructor(imageFolder, jsonFile, containerId) {
        // Basic configuration
        this.imageFolder = imageFolder;
        this.jsonFile = jsonFile;
        this.container = document.getElementById(containerId);
        this.imageContainer = this.container.querySelector('.image-container');
        this.debugInfo = document.getElementById('debug-info');
        this.imageInfo = document.getElementById('image-info');
        
        // Scrolling parameters
        this.scrollPosition = 0;
        this.scrollSpeed = 200;
        
        // Image management
        this.imageWrappers = [];
        this.isLoading = false;
        this.imagePaths = [];
        this.data = {};
        this.totalImages = 0;
        this.offsetX = 0;
        
        // UI parameters
        this.imageSize = this.getImageSize();
        
        // Initialize
        window.addEventListener('resize', () => {
            this.imageSize = this.getImageSize();
            this.updateDebugInfo();
        });
        this.updateDebugInfo();
    }
    
    // Get the current image size from CSS variable
    getImageSize() {
        try {
            const sizeStr = getComputedStyle(document.documentElement)
                .getPropertyValue('--image-size')
                .trim()
                .replace('px', '');
            
            const size = parseInt(sizeStr);
            if (!isNaN(size) && size > 0) {
                return size;
            }
            
            // Fallback based on device width
            return window.innerWidth < 768 ? 
                Math.min(Math.floor(window.innerWidth * 0.5), 300) : 
                500;
        } catch (e) {
            console.warn("Error getting image size from CSS, using fallback", e);
            return window.innerWidth < 768 ? 300 : 500;
        }
    }

    async init() {
        this.debugInfo.textContent = "Initializing image scroller...";
        try {
            // Load data
            const data = await this.loadJSON(this.jsonFile);
            this.imagePaths = Object.keys(data).map(fileName => `${this.imageFolder}/${fileName}`);
            this.data = data;
            this.totalImages = this.imagePaths.length;
            this.debugInfo.textContent = `Loaded ${this.totalImages} image paths`;

            // Start with a few images
            await this.loadInitialImages();
            
            // Begin scrolling and event handling
            this.startScrolling();
            this.setupEventListeners();
        } catch (error) {
            console.error("Initialization error:", error);
            this.debugInfo.textContent = `Error: ${error.message}`;
        }
    }

    async loadJSON(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch JSON: ${response.statusText}`);
        }
        return response.json();
    }
    
    async loadInitialImages() {
        // Load an initial set of 5 random images
        const firstImg = await this.loadRandomImage();
        for (let i = 0; i < 4; i++) {
            await this.loadRandomImage();
        }
    }
    
    async loadRandomImage() {
        if (this.isLoading) return null;
        this.isLoading = true;
        
        // Pick a random image from the full collection
        const randomIndex = Math.floor(Math.random() * this.totalImages);
        
        // Find the last image to connect to
        const lastImage = this.findLastActiveImage();
        
        // Load the image
        const result = await this.loadSingleImage(
            randomIndex, 
            lastImage ? lastImage.point : null, 
            lastImage ? lastImage.wrapper : null
        );
        
        this.isLoading = false;
        return result;
    }
    
    async loadSingleImage(index, prevPoint = null, prevWrapper = null) {
        return new Promise((resolve) => {
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'image-wrapper';
            
            const imgSize = this.getImageSize();
            const img = document.createElement('img');
            img.src = this.imagePaths[index];
            
            const timeout = setTimeout(() => {
                console.warn(`Image load timeout: ${img.src}`);
                resolve(null);
            }, 5000);
            
            img.onload = () => {
                clearTimeout(timeout);
                
                const filename = this.imagePaths[index].split('/').pop();
                const imageData = this.data[filename];
                
                if (!imageData || !imageData.points || !imageData.points.length) {
                    console.warn(`No points found for image: ${filename}`);
                    resolve(null);
                    return;
                }

                // Get connection points
                const points = imageData.points;
                const firstPoint = points[0];
                const lastPoint = points[points.length - 1];
                
                // Set dimensions
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                const scaleFactor = aspectRatio > 1 ? 
                    imgSize / img.naturalWidth : 
                    imgSize / img.naturalHeight;
                
                const scaledWidth = img.naturalWidth * scaleFactor;
                const scaledHeight = img.naturalHeight * scaleFactor;
                
                // Create metadata overlay
                // if (imageData.timestamp || imageData.location) {
                //     const metadataOverlay = document.createElement('div');
                //     metadataOverlay.className = 'metadata-overlay';
                    
                //     let metadataHtml = '';
                //     if (imageData.timestamp) {
                //         metadataHtml += `<div class="metadata-timestamp">${imageData.timestamp}</div>`;
                //     }
                //     if (imageData.location) {
                //         metadataHtml += `<div class="metadata-location">${imageData.location}</div>`;
                //     }
                    
                //     metadataOverlay.innerHTML = metadataHtml;
                //     imageWrapper.appendChild(metadataOverlay);
                // }
                
                // Position this image
                if (prevPoint && prevWrapper) {
                    try {
                        // Use scaledWidth/scaledHeight directly
                        const firstPointPx = {
                            x: firstPoint[0] * scaledWidth,
                            y: firstPoint[1] * scaledHeight
                        };
                        
                        // Get previous position
                        const prevLeft = parseFloat(prevWrapper.style.left) || 0;
                        const prevTop = parseFloat(prevWrapper.style.top) || 0;
                        
                        // Calculate new position with proper scaling
                        const newX = prevLeft + prevPoint.x - firstPointPx.x;
                        const newY = prevTop + prevPoint.y - firstPointPx.y;
                        
                        // Apply position
                        imageWrapper.style.left = `${newX}px`;
                        imageWrapper.style.top = `${newY}px`;
                        
                    } catch (e) {
                        console.error(`Position calculation error:`, e);
                        // Fallback position
                        imageWrapper.style.left = `${(window.innerWidth - imgSize) / 2}px`;
                        imageWrapper.style.top = `${window.innerHeight + this.scrollPosition}px`;
                    }
                } else {
                    // Position first image
                    imageWrapper.style.left = `${(window.innerWidth - imgSize) / 2}px`;
                    imageWrapper.style.top = `${(window.innerHeight - imgSize) / 2}px`;
                }
                
                // Calculate next connection point
                const nextPoint = {
                    x: lastPoint[0] * scaledWidth,
                    y: lastPoint[1] * scaledHeight
                };
                
                // Store for future connections
                imageWrapper.dataset.nextConnectionPoint = JSON.stringify(nextPoint);
                
                // Add to DOM
                imageWrapper.appendChild(img);
                this.imageContainer.appendChild(imageWrapper);
                this.imageWrappers.push(imageWrapper);

                // Animation classes
                imageWrapper.classList.add('loading');
                setTimeout(() => {
                    imageWrapper.classList.add('loaded');
                }, 50);

                resolve({
                    wrapper: imageWrapper,
                    point: nextPoint
                });
            };

            img.onerror = () => {
                clearTimeout(timeout);
                console.error(`Failed to load image: ${img.src}`);
                resolve(null);
            };
        });
    }
    
    findLastActiveImage() {
        if (this.imageWrappers.length === 0) return null;
        
        const visibleWrappers = this.imageWrappers.filter(w => w && w.isConnected);
        if (visibleWrappers.length === 0) return null;
        
        // Find the bottom-most image
        const sortedByBottom = [...visibleWrappers].sort((a, b) => {
            const aRect = a.getBoundingClientRect();
            const bRect = b.getBoundingClientRect();
            return bRect.bottom - aRect.bottom;
        });
        
        const wrapper = sortedByBottom[0];
        
        // Get connection point
        try {
            if (wrapper.dataset.nextConnectionPoint) {
                return {
                    wrapper: wrapper,
                    point: JSON.parse(wrapper.dataset.nextConnectionPoint)
                };
            }
        } catch (e) {
            console.error("Error finding last active image:", e);
            return null;
        }
    }

    updateImagePositions() {
        if (this.imageWrappers.length === 0) return;

        // Find image closest to center of screen
        const middleY = window.innerHeight / 2;
        let closestWrapper = null;
        let closestDistance = Infinity;

        for (const wrapper of this.imageWrappers) {
            if (!wrapper || !wrapper.isConnected) continue;
            
            const rect = wrapper.getBoundingClientRect();
            const wrapperCenterY = rect.top + rect.height / 2;
            const distance = Math.abs(wrapperCenterY - middleY);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestWrapper = wrapper;
            }
        }

        if (closestWrapper) {
            // Update image info panel
            this.updateImageInfo(closestWrapper);
            
            // Update debug info
            this.updateDebugInfo();
            
            // Center horizontally
            const left = parseFloat(closestWrapper.style.left) || 0;
            const imgSize = this.getImageSize();
            const imageCenterX = left + (imgSize / 2);
            const viewportCenterX = window.innerWidth / 2;
            
            const targetOffsetX = viewportCenterX - imageCenterX;
            
            // Smooth transition
            if (!this.offsetX || Math.abs(targetOffsetX - this.offsetX) > 3) {
                this.offsetX = this.offsetX ? 
                    this.offsetX + (targetOffsetX - this.offsetX) * 0.1 : 
                    targetOffsetX;
                
                this.container.style.transform = `translateX(${this.offsetX}px)`;
            }
            
            // Check if we need more images or cleanup
            this.manageImages();
        }
    }

    updateImageInfo(wrapper) {
        if (!wrapper) return;
        
        try {
            // Get image data
            const img = wrapper.querySelector('img');
            if (!img) return;
            
            const filename = img.src.split('/').pop();
            const imageData = this.data[filename];
            
            // Store the current image data for use in updateDebugInfo
            this.currentImageData = imageData;
            
            // Update debug info to include this new image data
            this.updateDebugInfo();
            
            // Clear the separate image info panel since we're including it in debug info
            if (this.imageInfo) {
                this.imageInfo.innerHTML = '';
            }
        } catch (error) {
            console.error("Error updating image info:", error);
        }
    }

    manageImages() {
        // Add new images at the bottom when needed
        this.addImagesIfNeeded();
        
        // Remove images that are off-screen at the top
        this.removeOffscreenImages();
    }

    addImagesIfNeeded() {
        // Find the bottom-most image
        let maxBottom = -Infinity;
        const viewportBottom = window.innerHeight;
        
        for (const wrapper of this.imageWrappers) {
            if (!wrapper || !wrapper.isConnected) continue;
            const rect = wrapper.getBoundingClientRect();
            maxBottom = Math.max(maxBottom, rect.bottom);
        }
        
        // If we don't have enough content to fill the screen plus some buffer
        if (maxBottom < viewportBottom + 1000 && !this.isLoading) {
            this.loadRandomImage();
        }
    }

    removeOffscreenImages() {
        // Maximum images to keep in DOM for performance
        const maxImages = 30;
        
        // Only remove images if we have too many
        if (this.imageWrappers.length <= maxImages) return;
        
        // Find images that are completely off-screen above
        const toRemove = [];
        
        for (const wrapper of this.imageWrappers) {
            if (!wrapper || !wrapper.isConnected) continue;
            
            const rect = wrapper.getBoundingClientRect();
            // If the image is completely above the viewport (with buffer)
            if (rect.bottom < -500) {
                toRemove.push(wrapper);
            }
        }
        
        // Remove oldest images first until we're back under the limit
        while (toRemove.length > 0 && this.imageWrappers.length - toRemove.length > maxImages/2) {
            const wrapper = toRemove.shift();
            wrapper.remove();
        }
        
        // Update our tracking array
        this.imageWrappers = this.imageWrappers.filter(w => w && w.isConnected);
    }

    startScrolling() {
        let lastTimestamp = 0;
        
        const scroll = (timestamp) => {
            if (!lastTimestamp) lastTimestamp = timestamp;
            const elapsed = timestamp - lastTimestamp;
            
            // Calculate scroll amount
            const scrollAmount = (this.scrollSpeed * elapsed) / 1000;
            this.scrollPosition += scrollAmount;
            
            // Apply vertical scroll
            this.imageContainer.style.transform = `translateY(-${this.scrollPosition}px)`;
            
            // Update image positions and info
            this.updateImagePositions();
            
            lastTimestamp = timestamp;
            requestAnimationFrame(scroll);
        };
        
        requestAnimationFrame(scroll);
    }

    setupEventListeners() {
        // Keyboard controls for speed
        document.addEventListener('keydown', (e) => {
            if (e.key === 's' || e.key === 'S') {
                // Toggle scroll speed
                if (this.scrollSpeed === 200) {
                    this.scrollSpeed = 400;
                } else if (this.scrollSpeed === 400) {
                    this.scrollSpeed = 100;
                } else {
                    this.scrollSpeed = 200;
                }
                this.updateDebugInfo();
            } else if (e.key === 'l' || e.key === 'L') {
                // Load a new image immediately
                this.loadRandomImage();
            }
        });
    }

    updateDebugInfo() {
        if (this.debugInfo) {
            let timestampText = "";
            let locationText = "";
            
            // Add current image info if available
            if (this.currentImageData) {
                // First line: timestamp and coordinates
                if (this.currentImageData.timestamp) {
                    timestampText = `${this.currentImageData.timestamp}`;
                }
                
                // Add coordinates to first line if available
                if (this.currentImageData.coordinates && this.currentImageData.coordinates.length === 2) {
                    if (timestampText) timestampText += " ";
                    const [lat, lon] = this.currentImageData.coordinates;
                    timestampText += `(${lat.toFixed(4)}, ${lon.toFixed(4)})`;
                }
                
                // Second line: location
                if (this.currentImageData.location) {
                    locationText = `${this.currentImageData.location}`;
                }
            }
            
            // If there's no metadata at all, show a minimal message
            if (!timestampText && !locationText) {
                timestampText = "No image metadata";
            }
            
            // Create two-line structure
            this.debugInfo.innerHTML = `
                <div class="timestamp-line">${timestampText}</div>
                ${locationText ? `<div class="location-line">${locationText}</div>` : ''}
            `;
        }
    }
}

// Add this as a self-executing function at the end of your file (after the ImageScroller class)

(function addDebugLogging() {
    // Store original methods we're going to log
    const originalLoadSingleImage = ImageScroller.prototype.loadSingleImage;
    const originalFindLastActiveImage = ImageScroller.prototype.findLastActiveImage;
    
    // Override loadSingleImage with a logging version
    ImageScroller.prototype.loadSingleImage = async function(index, prevPoint, prevWrapper) {
        console.group(`🖼️ Loading image #${index}`);
        console.log('Previous connection point:', prevPoint);
        console.log('Previous wrapper:', prevWrapper);
        console.log('Image size:', this.getImageSize());
        
        // Call the original method
        const result = await originalLoadSingleImage.call(this, index, prevPoint, prevWrapper);
        
        // After image is loaded, log the result
        if (result) {
            const wrapper = result.wrapper;
            const nextPoint = result.point;
            
            console.log('📏 Positioning Results:');
            console.log('Final position:', {
                left: wrapper.style.left,
                top: wrapper.style.top
            });
            console.log('Next connection point:', nextPoint);
            
            // Analyze object-fit effects by looking at the actual rendered image
            setTimeout(() => {
                try {
                    const img = wrapper.querySelector('img');
                    if (img) {
                        const imgRect = img.getBoundingClientRect();
                        const wrapperRect = wrapper.getBoundingClientRect();
                        
                        console.log('Actual rendered measurements:', {
                            wrapper: {
                                width: wrapperRect.width,
                                height: wrapperRect.height
                            },
                            image: {
                                width: imgRect.width,
                                height: imgRect.height,
                                naturalWidth: img.naturalWidth,
                                naturalHeight: img.naturalHeight
                            },
                            ratio: {
                                wrapper: wrapperRect.width / wrapperRect.height,
                                image: img.naturalWidth / img.naturalHeight
                            }
                        });
                    }
                } catch (e) {
                    console.warn('Could not measure rendered image', e);
                }
            }, 50);
        }
        
        console.groupEnd();
        return result;
    };
    
    // Override findLastActiveImage with a logging version
    ImageScroller.prototype.findLastActiveImage = function() {
        console.group('🔍 Finding last active image');
        
        // Call the original method
        const result = originalFindLastActiveImage.call(this);
        
        if (result) {
            console.log('Found last wrapper:', result.wrapper);
            console.log('Connection point:', result.point);
            
            try {
                // Calculate and log the actual rendered position of the connection point
                const rect = result.wrapper.getBoundingClientRect();
                console.log('Wrapper rect:', rect);
                
                // Analyze the connection point in absolute screen coordinates
                const absolutePoint = {
                    x: rect.left + result.point.x,
                    y: rect.top + result.point.y
                };
                console.log('Absolute connection point (screen coords):', absolutePoint);
            } catch (e) {
                console.warn('Error calculating absolute point', e);
            }
        } else {
            console.log('No active image found');
        }
        
        console.groupEnd();
        return result;
    };
    
    // Add a method to analyze a specific image connection
    window.analyzeImageConnection = function(index) {
        const scroller = document.querySelector('#scroll-container').__scroller;
        if (!scroller || !scroller.imageWrappers) {
            console.error('Scroller not found');
            return;
        }
        
        let wrapper = null;
        if (typeof index === 'number') {
            wrapper = scroller.imageWrappers[index];
        } else {
            // Analyze the last image
            wrapper = scroller.imageWrappers[scroller.imageWrappers.length - 1];
        }
        
        if (!wrapper) {
            console.error('Wrapper not found');
            return;
        }
        
        console.group(`🔬 Analyzing image connection ${index}`);
        
        try {
            const rect = wrapper.getBoundingClientRect();
            const img = wrapper.querySelector('img');
            const connectionPoint = JSON.parse(wrapper.dataset.nextConnectionPoint || '{}');
            
            console.log('Wrapper position:', {
                left: wrapper.style.left,
                top: wrapper.style.top
            });
            
            console.log('Bounding rect:', rect);
            console.log('Connection point (px):', connectionPoint);
            
            // Calculate the absolute position of the connection point
            const absolutePoint = {
                x: rect.left + connectionPoint.x,
                y: rect.top + connectionPoint.y
            };
            
            console.log('Absolute connection point:', absolutePoint);
            
            if (img) {
                console.log('Image dimensions:', {
                    natural: {
                        width: img.naturalWidth,
                        height: img.naturalHeight
                    },
                    rendered: {
                        width: img.getBoundingClientRect().width,
                        height: img.getBoundingClientRect().height
                    },
                    style: {
                        objectFit: getComputedStyle(img).objectFit
                    }
                });
                
                // Calculate how object-fit might be affecting the connection point
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                const containerWidth = rect.width;
                const containerHeight = rect.height;
                
                // Calculate effective dimensions after object-fit
                let effectiveWidth, effectiveHeight;
                if (aspectRatio > containerWidth / containerHeight) {
                    // Width constrained by container height
                    effectiveHeight = containerHeight;
                    effectiveWidth = containerHeight * aspectRatio;
                } else {
                    // Height constrained by container width
                    effectiveWidth = containerWidth;
                    effectiveHeight = containerWidth / aspectRatio;
                }
                
                console.log('Object-fit effective dimensions:', {
                    width: effectiveWidth,
                    height: effectiveHeight,
                    xScale: effectiveWidth / img.naturalWidth,
                    yScale: effectiveHeight / img.naturalHeight
                });
            }
            
        } catch (e) {
            console.error('Analysis error:', e);
        }
        
        console.groupEnd();
    };
    
    // Automatically store the scroller instance for easy debugging
    const originalInit = ImageScroller.prototype.init;
    ImageScroller.prototype.init = async function() {
        const result = await originalInit.call(this);
        this.container.__scroller = this;
        console.log('Debug logging enabled. Use window.analyzeImageConnection() to analyze connections.');
        return result;
    };
    
    console.log('Debug logging for Ground Breaking project initialized');
})();