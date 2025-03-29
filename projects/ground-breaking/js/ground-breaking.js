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
                if (imageData.timestamp || imageData.location) {
                    const metadataOverlay = document.createElement('div');
                    metadataOverlay.className = 'metadata-overlay';
                    
                    let metadataHtml = '';
                    if (imageData.timestamp) {
                        metadataHtml += `<div class="metadata-timestamp">${imageData.timestamp}</div>`;
                    }
                    if (imageData.location) {
                        metadataHtml += `<div class="metadata-location">${imageData.location}</div>`;
                    }
                    
                    metadataOverlay.innerHTML = metadataHtml;
                    imageWrapper.appendChild(metadataOverlay);
                }
                
                // Position this image
                if (prevPoint && prevWrapper) {
                    try {
                        // Convert percentage to actual pixels
                        const firstPointPx = {
                            x: firstPoint[0] * scaledWidth,
                            y: firstPoint[1] * scaledHeight
                        };
                        
                        const prevLeft = parseFloat(prevWrapper.style.left) || 0;
                        const prevTop = parseFloat(prevWrapper.style.top) || 0;
                        
                        const newX = prevLeft + prevPoint.x - firstPointPx.x;
                        const newY = prevTop + prevPoint.y - firstPointPx.y;
                        
                        imageWrapper.style.left = `${newX}px`;
                        imageWrapper.style.top = `${newY}px`;
                        imageWrapper.style.zIndex = Date.now().toString();
                    } catch (e) {
                        console.error(`Position calculation error:`, e);
                        imageWrapper.style.left = `${(window.innerWidth - imgSize) / 2}px`;
                        imageWrapper.style.top = `${window.innerHeight + this.scrollPosition}px`;
                    }
                } else {
                    // First image - center it
                    imageWrapper.style.left = `${(window.innerWidth - imgSize) / 2}px`;
                    imageWrapper.style.top = `${(window.innerHeight - imgSize) / 2}px`;
                    imageWrapper.style.zIndex = '1';
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
            // Initialize empty debug text (no size or speed)
            let debugText = "";
            
            // Add current image info if available
            if (this.currentImageData) {
                // Add timestamp if available
                if (this.currentImageData.timestamp) {
                    debugText += `${this.currentImageData.timestamp}`;
                }
                
                // Add location if available
                if (this.currentImageData.location) {
                    // Add separator if we already have content
                    if (debugText) debugText += " | ";
                    debugText += `${this.currentImageData.location}`;
                }
                
                // Add coordinates in simplified format if available
                if (this.currentImageData.coordinates && this.currentImageData.coordinates.length === 2) {
                    // Add separator if we already have content
                    if (debugText) debugText += " | ";
                    const [lat, lon] = this.currentImageData.coordinates;
                    debugText += `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                }
            }
            
            // If there's no metadata at all, show a minimal message
            if (!debugText) {
                debugText = "No image metadata";
            }
            
            this.debugInfo.textContent = debugText;
        }
    }
}