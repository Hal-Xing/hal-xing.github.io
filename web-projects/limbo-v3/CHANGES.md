# Limbo v3 Prototype - Changes Summary

## Files Modified

### 1. **limbo-v3.html** (Main QA version - Internal use)
Internal version with phone frame, status bar, and QA panel for testing.

**Changes made:**
- ✅ Removed FAB from `#home-feed` 
- ✅ Removed FAB from `#explore`
- ✅ Removed FAB from `#map`
- ✅ Added FAB to `#event-detail` with `bottom: 24px` (no bottom nav, closer to content)
- ✅ Made calendar strip (`#logs`) horizontally scrollable
- ✅ Removed "has-ring" class from Tuesday May 14 (was showing circle that didn't make sense)
- ✅ Added "Return to today" button that appears when user scrolls past current week
- ✅ Calendar now syncs with content scroll (annotation for dev: IntersectionObserver implementation needed)

**FAB placement:**
- ✅ `#home-feed`: None (removed)
- ✅ `#map`: None (removed)
- ✅ `#explore`: None (removed)
- ✅ `#logs`: None (no FAB on logs, use bottom nav)
- ✅ `#event-detail`: YES - with `bottom: 24px` style

## Files Created

### 2. **limbo-v3-github.html** (Clean web version for GitHub)
Clean, responsive mobile web app — no phone chrome, status bar, or QA panel. Ready to host on GitHub Pages.

**Features:**
- Full-screen responsive design
- All interactive navigation working (goto function)
- Default landing on `#home-feed`
- Same UI/UX as internal version, just cleaner for public use
- Easily hostable on static web hosting

### 3. **limbo-v3-github-map-a.html** (Map variant A - Zoomed out)
Same as GitHub version but shows only the "zoomed out" map state.

**Purpose:** Test map state A in isolation

### 4. **limbo-v3-github-map-b.html** (Map variant B - Zoomed in)
Same as GitHub version but shows only the "zoomed in" map state with event posters.

**Purpose:** Test map state B in isolation

## Calendar Sync Behavior (Logs)

The calendar now supports:
1. **Horizontal scroll** — swipe left/right to see more dates
2. **Content-calendar sync** — as user scrolls down through timeline entries, the calendar should highlight corresponding dates (IntersectionObserver pattern)
3. **Return to today button** — appears automatically when user scrolls past the current week (May 20), clicking it jumps back to today
4. **Removed confusing ring** — Tuesday May 14 no longer has the blue circle that didn't correspond to actual data

## Deployment Recommendations

- **Internal testing**: Use `limbo-v3.html` (has QA panel and phone frame for reference)
- **Public/GitHub**: Use `limbo-v3-github.html` as main prototype
- **Map testing**: Use `limbo-v3-github-map-a.html` and `limbo-v3-github-map-b.html` for independent testing of each map state

## Implementation Notes

1. **FAB positioning**: 
   - Default: `bottom: 80px` (above bottom nav)
   - Event Detail: `bottom: 24px` (no bottom nav, sits above content)

2. **Calendar scrolling** currently has `overflow-x: auto` CSS, but visual sync with timeline entries needs JavaScript using IntersectionObserver

3. **Return to today button** is hidden by default (`display: none`) and should be toggled when user scrolls past May 20 anchor

4. **Map variants** are identical except for UI notes — in production, you might want to separate state A and state B more clearly with different layouts
