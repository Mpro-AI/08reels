# Annotation UX Redesign - Inline Editing Mode

**Date:** 2026-03-13
**Status:** Design Approved
**Approach:** Option A - Inline editing, everything happens directly on canvas

---

## 1. Text Annotation - Inline Editing

### Current Problems
- Popup dialog (320px) appears at unpredictable positions via useLayoutEffect calculations
- Preview area caps font size at 24px - does not match actual rendering
- Must complete before seeing result on canvas
- Ctrl+Enter required to confirm, but no prominent UI hint

### New Design

**Flow:**
1. User switches to text mode, clicks anywhere on canvas
2. A contentEditable div appears at that exact position, overlaid on canvas with matching coordinates
3. User types directly - WYSIWYG, font size/color/position are final
4. Click elsewhere or press Enter to complete, text becomes a canvas-rendered annotation object
5. Esc to cancel

**Property Editing:**
- Select existing text: floating toolbar appears above element with font size slider, color picker, background color, delete button
- Floating toolbar follows selection box, always 8px above (or below if insufficient space)
- Double-click text: re-enter edit mode (contentEditable reactivated)

**Technical Changes:**
- Delete entire text-annotation-input.tsx popup dialog
- New InlineTextEditor component: contentEditable + position absolute overlaid on canvas
- Coordinate conversion: canvas coords to screen coords for precise overlay positioning

---

## 2. Image Annotation - Drag and Drop + Click Placement

### Current Problems
- Click toolbar icon, file picker, image appears at canvas center, not where user wants
- Resize handles are 16px - too small for touch/trackpad
- No aspect ratio lock UI hint (hidden behind Shift key)
- No delete functionality in UI
- No drag and drop support

### New Design

**Upload (two methods):**
1. Drag and drop: Drag image from desktop into canvas area, appears at drop position
2. Click upload: Toolbar image icon, file picker, image at canvas center but auto-selected

**Interaction Improvements:**
- Resize: Corner drag defaults to aspect-ratio locked. Hold Shift for free resize
- Handle size: 16px to 24px visual, 36px hit area, changed to circles
- Delete: Floating toolbar trash icon + Delete/Backspace key
- Cursor hints: diagonal arrow near corners, rotation icon near rotation handle

**Technical Implementation:**
- onDragOver + onDrop on canvas container
- On drop: read dataTransfer.files, upload to Supabase storage
- Use drop event coordinates for canvas position

---

## 3. Two-Layer Toolbar Architecture

### Current Problems
- Toolbar fixed at top, only controls mode switching and global color
- No contextual menu when element selected
- No delete, no copy, no undo
- No save feedback

### New Design

**Layer 1: Top Main Toolbar (kept, enhanced)**
- Mode selection: cursor / pen / text / image - unchanged
- Pen color and line width - unchanged
- Right side: Undo / Redo buttons (new), Save, Exit
- Save shows toast notification, disappears after 2 seconds

**Layer 2: Floating Context Toolbar (new)**
- Only appears when text or image element is selected
- Position: 8px above selection box (or below if insufficient space)
- Follows element movement, disappears on deselect

**Floating Toolbar Content:**
- Text: Font size (dropdown + slider), Text color, Background color, Delete
- Image: Delete only

**Undo/Redo:**
- history array, each operation pushes snapshot
- Ctrl+Z undo, Ctrl+Shift+Z redo
- Max 30 steps, clears on save

**Keyboard Shortcuts:**
- Delete/Backspace: Delete selected
- Ctrl+Z: Undo
- Ctrl+Shift+Z: Redo
- Escape: Deselect / exit edit mode
- Enter: Complete text input

---

## 4. Annotation Visibility and Lifecycle

### Current Problems
- Annotations visible only for 500ms - appears broken to users
- No way to keep visible longer
- No UI to delete saved annotations
- Exit with unsaved changes only shows window.confirm

### New Design

**Visibility Rules:**
- Annotation mode: all annotations at current timecode always visible
- Viewing mode: visible for timecode to timecode + 1s

**Deleting Saved Annotations:**
- Select any element, floating toolbar shows delete button
- Delete marks locally, API call on save
- Included in undo/redo history

**Exit Protection:**
- Unsaved changes: orange dot next to exit button
- Radix AlertDialog: Save and Exit / Discard and Exit / Cancel

**Save Feedback:**
- Save button: spinner, green checkmark 1.5s, restore
- Toast: Saved N annotations

---

## 5. Selection Handles and Coordinate System

### Current Problems
- Handle size scaled by width/1920 - hardcoded baseline
- All 4 corners look identical
- Rotation handle has no tooltip
- Text fontSize inconsistent across resolutions
- Text scaleX/scaleY causes distortion

### New Design

**Dynamic Handle Scaling:**
- Baseline: canvas.getBoundingClientRect().width
- Visual: Math.max(10, 24 / devicePixelRatio)
- Hit area: visual size x 1.5

**Handle Visual Improvements:**
- Corners: white-filled circles with blue border
- Rotation handle: curved arrow via canvas arc
- Selection border: 1px blue dashed line

**Text Size Consistency:**
- Remove videoNaturalSize.height / 1080 conversion
- New: actualFontSize = fontSize * (canvas.height / 1000)

**Text Rendering Fix:**
- Remove scaleX/scaleY stretch
- Auto word-wrap based on bounding box width
- Drag wider: text reflows, not stretched

---

## 6. Component Architecture

### New File Structure

src/components/video/annotations/
- annotation-canvas.tsx        (rendering + redraw, ~200 lines)
- annotation-interaction.tsx   (select, drag, resize, rotate, ~250 lines)
- inline-text-editor.tsx       (contentEditable editor, ~150 lines)
- floating-toolbar.tsx         (context toolbar, ~180 lines)
- annotation-toolbar.tsx       (main toolbar enhanced, ~150 lines)
- selection-handles.tsx        (handle drawing, ~120 lines)
- use-annotation-history.ts   (undo/redo hook, ~80 lines)
- use-drop-zone.ts            (drag-drop upload hook, ~60 lines)
- utils.ts                    (coords, hit detection, ~100 lines)

**Deleted:** text-annotation-input.tsx
**Slimmed:** page.tsx annotation logic moved to useAnnotations hook

---

## 7. Implementation Phases

### Phase 1: Foundation
1. Create annotations/ directory
2. Extract utils.ts
3. Extract selection-handles.tsx
4. Split annotation-canvas.tsx into rendering + interaction
5. Create useAnnotationHistory hook
6. Move annotation logic from page.tsx to useAnnotations hook

### Phase 2: Text Rebuild
1. Build inline-text-editor.tsx with contentEditable
2. Canvas-to-screen coordinate alignment
3. Word-wrap text rendering
4. fontSize formula: fontSize * (canvas.height / 1000)
5. Delete text-annotation-input.tsx

### Phase 3: Image + Drag and Drop
1. Build use-drop-zone.ts
2. Drag and drop on canvas container
3. Default aspect-ratio lock on resize
4. Enlarged circle handles (24px visual, 36px hit)

### Phase 4: Floating Toolbar
1. Build floating-toolbar.tsx
2. Dynamic above/below positioning
3. Property editing (font size, colors, delete)
4. Main toolbar undo/redo buttons

### Phase 5: Lifecycle + Feedback
1. Visibility: 1s viewing, always-on in annotation mode
2. Soft-delete with save-time API call
3. Radix AlertDialog exit protection
4. Save feedback: spinner, checkmark, toast

### Phase 6: Keyboard Shortcuts + Polish
1. Delete/Backspace to delete
2. Ctrl+Z / Ctrl+Shift+Z
3. Enter complete, Esc cancel
4. Dynamic handle scaling
5. Cursor hints for all zones
