document.addEventListener('DOMContentLoaded', function () {
    // Add arrows to active menu links
    function addArrowsToActiveLinks() {
        console.log('Updating menu indicators');
        
        // Get current path from location hash
        const currentPath = window.location.hash.slice(1) || '';
        console.log('Current path:', currentPath);
        
        // Remove existing arrows
        document.querySelectorAll('.arrow-indicator').forEach(arrow => arrow.remove());
        document.querySelectorAll('.menu a.active').forEach(link => {
            link.classList.remove('active');
        });

        // Add arrows to active links by matching against the hash path
        document.querySelectorAll('.menu a').forEach(link => {
            const linkHref = link.getAttribute('href');
            
            // Clean up URLs for comparison
            const normalizedLinkHref = linkHref.replace(/^\//, '').replace(/\/$/, '');
            const normalizedCurrentPath = currentPath.replace(/^\//, '').replace(/\/$/, '');
            
            console.log('Comparing:', normalizedLinkHref, 'vs', normalizedCurrentPath);
            
            if (normalizedCurrentPath.startsWith(normalizedLinkHref) || 
                (normalizedCurrentPath === '' && normalizedLinkHref === document.querySelector('.menu a').getAttribute('href').replace(/^\//, ''))) {
                
                console.log('Active link found:', linkHref);
                
                const arrow = document.createElement('span');
                arrow.className = 'arrow-indicator';
                arrow.textContent = '→';
                link.appendChild(arrow);

                // Add active class
                link.classList.add('active');
            }
        });
    }

    // Update on hash change
    window.addEventListener('hashchange', function() {
        console.log('Hash changed, updating indicators');
        addArrowsToActiveLinks();
    });

    // Initial update
    addArrowsToActiveLinks();
    
    // Also update when router.js loads content
    document.addEventListener('contentLoaded', function() {
        console.log('Content loaded event, updating indicators');
        addArrowsToActiveLinks();
    });
});