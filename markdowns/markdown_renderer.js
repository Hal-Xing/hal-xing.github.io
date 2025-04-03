class MarkdownView {
    constructor(options = {}) {
        this.options = {
            container: '.markdown-content',
            imagesPath: '../images/',
            ...options
        };
        
        this.container = document.querySelector(this.options.container);
        this.init();
    }
    
    async init() {
        if (!this.container) return;
        
        // Get the markdown file path from the container's data attribute
        const markdownPath = this.container.dataset.markdown;
        if (!markdownPath) return;
        
        try {
            // Fetch the markdown content
            const response = await fetch(markdownPath);
            if (!response.ok) throw new Error(`Failed to fetch markdown: ${response.statusText}`);
            
            const markdown = await response.text();
            this.render(markdown);
        } catch (error) {
            console.error('Error loading markdown:', error);
            this.container.innerHTML = `<p class="error">Failed to load content: ${error.message}</p>`;
        }
    }
    
    render(markdown) {
        // Simple markdown parser - this is very basic
        // For a real implementation, consider using marked.js or another library
        
        // Process paragraphs and headers
        let html = markdown
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^\s*\n/gm, '</p><p>');
        
        // Process images with Bootstrap-like classes
        html = html.replace(/!\[(.*?)\]\((.*?)\)(\{(.*?)\})?/g, (match, alt, src, _, classes) => {
            const cssClasses = classes ? classes : '';
            return `<figure class="image ${cssClasses}">
                <img src="${this.options.imagesPath}${src}" alt="${alt}" loading="lazy">
                <figcaption>${alt}</figcaption>
            </figure>`;
        });
        
        // Process links
        html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
        
        // Process emphasis
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Wrap in paragraphs if not already and add container div
        html = `<div class="text-content"><p>${html}</p></div>`;
        html = html.replace(/<p><\/p>/g, ''); // Remove empty paragraphs
        
        this.container.innerHTML = html;
    }
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    const markdownView = new MarkdownView();
});