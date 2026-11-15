// Ground Breaking: the picture tilts as people scroll or drag, at most 20 degrees either way, and stays where they leave it.
// Self-contained add-on for web-projects/ground-breaking: load it after ground-breaking.js. It does not change the scroller itself.
(function () {
    const MAX = 20;                                   // degrees, either way
    const c = document.getElementById('scroll-container');
    if (!c) return;
    const wrap = document.createElement('div');       // the scroller keeps its own transform; the tilt goes on a wrapper around it
    wrap.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;transform-origin:50% 50%;will-change:transform';
    c.parentNode.insertBefore(wrap, c); wrap.appendChild(c);
    const stage = wrap.parentNode; stage.style.perspective = '1100px'; stage.style.perspectiveOrigin = '50% 50%';
    let target = 0, now = 0, dragY = null;
    const add = d => { target = Math.min(MAX, Math.max(-MAX, target + d)); };
    addEventListener('wheel', e => { add(-e.deltaY * 0.03); }, { passive: true });         // like tilting a map: two fingers pushed up on a Mac trackpad = the upper end leans away; pulled down = back through flat, then the lower end leans away
    addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') dragY = e.clientY; });   // a finger drag tilts (phones); a mouse click-drag does nothing
    addEventListener('pointermove', e => { if (dragY !== null) { add((dragY - e.clientY) * 0.08); dragY = e.clientY; } });
    addEventListener('pointerup', () => { dragY = null; }); addEventListener('pointercancel', () => { dragY = null; });
    addEventListener('keydown', e => { if (e.key === 'ArrowDown') add(4); if (e.key === 'ArrowUp') add(-4); });
    document.body.style.touchAction = 'none';         // a finger drag tilts instead of trying to scroll a page that does not scroll
    (function frame() {
        if (Math.abs(target - now) > 0.01) { now += (target - now) * 0.12; wrap.style.transform = Math.abs(now) > 0.02 ? `rotateX(${-now}deg)` : ''; }
        requestAnimationFrame(frame);
    })();
    window.groundBreakingTilt = () => now;            // for checking
})();
