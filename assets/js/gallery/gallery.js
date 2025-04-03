document.addEventListener('DOMContentLoaded', function() {
    // Find elements
    const container = document.querySelector('.gallery-container');
    
    // Only count image items
    const items = container?.querySelectorAll('.gallery-item') || [];
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const counter = document.getElementById('counter');
    
    let currentIndex = 0;
    const total = items.length;
    
    // Update counter display
    function updateCounter() {
        if (counter) counter.textContent = `${currentIndex + 1} / ${total}`;
    }
    
    // Scroll to an item
    function scrollToItem(index) {
        if (!items[index]) return;
        
        items[index].scrollIntoView({
            behavior: 'smooth',
            block: 'end',
            inline: 'center'
        });
    }
    
    // Simple navigate function
    function navigate(direction) {
        currentIndex = (currentIndex + direction + total) % total;
        scrollToItem(currentIndex);
        updateCounter();
    }
    
    // Add click event listeners for navigation
    if (prevBtn) prevBtn.addEventListener('click', () => navigate(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => navigate(1));
    
    // Add keyboard navigation
    document.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') navigate(-1);
        if (e.key === 'ArrowRight') navigate(1);
    });
    
    // SIMPLIFIED: Check for visible items during scroll
    if (container) {
        // Use Intersection Observer for better performance
        const observer = new IntersectionObserver((entries) => {
            // Find the entry with the highest intersection ratio
            let highestEntry = null;
            let highestRatio = 0;
            
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > highestRatio) {
                    highestRatio = entry.intersectionRatio;
                    highestEntry = entry;
                }
            });
            
            // Update current index if we found a visible entry
            if (highestEntry) {
                const visibleElement = highestEntry.target;
                const newIndex = Array.from(items).indexOf(visibleElement);
                
                if (newIndex !== -1 && newIndex !== currentIndex) {
                    currentIndex = newIndex;
                    updateCounter();
                }
            }
        }, {
            root: container,
            threshold: 0.5, // At least 50% visible
            rootMargin: '0px'
        });
        
        // Observe all gallery items
        items.forEach(item => {
            observer.observe(item);
        });
        
        // Also detect manual scrolling
        container.addEventListener('scroll', () => {
            // This triggers the observer to re-check intersections
        });
    }
    
    // Style navigation arrows
    if (prevBtn) prevBtn.textContent = "←";
    if (nextBtn) nextBtn.textContent = "→";
    
    // Initial setup
    updateCounter();
});