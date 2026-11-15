// Marks the open page in the menus with a small arrow.
document.addEventListener('DOMContentLoaded', function () {
    const trim = s => s.replace(/^\//, '').replace(/\/$/, '');

    function update() {
        const current = trim(location.hash.slice(1));
        document.querySelectorAll('.arrow-indicator').forEach(a => a.remove());
        document.querySelectorAll('.menu a').forEach(link => {
            const href = trim(link.getAttribute('href'));
            const active = current !== '' && current.startsWith(href);
            link.classList.toggle('active', active);
            if (active) {
                const arrow = document.createElement('span');
                arrow.className = 'arrow-indicator';
                arrow.textContent = '→';
                link.appendChild(arrow);
            }
        });
    }

    window.addEventListener('hashchange', update);
    update();
});
