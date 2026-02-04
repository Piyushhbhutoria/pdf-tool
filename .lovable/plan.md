

# PDF Compression Fix Plan

## Problem Analysis

The current PDF compression implementation doesn't actually compress the PDF content. Here's why:

### Current Implementation Issues

1. **pdf-lib's `save()` method doesn't compress images**: The current code only uses `useObjectStreams: true` and `objectsPerTick` options, which:
   - `useObjectStreams` - Groups PDF objects into streams (minimal size impact)
   - `objectsPerTick` - Controls processing speed, not compression
   - `updateFieldAppearances` - Related to form fields, not compression

2. **PDFs are mostly images**: Most PDF file size comes from embedded images. The current code doesn't touch the images at all - it just repackages the same data.

3. **No actual image quality reduction**: The quality presets (high/medium/low) change only processing options, not image quality.

## Solution: Render Pages as Compressed Images

Since pdf-lib cannot modify/compress existing embedded images directly, the solution is to:
1. Render each PDF page as an image using pdfjs-dist (already in the project)
2. Compress that image using Canvas API with JPEG compression
3. Create a new PDF with the compressed images as pages

This approach works entirely client-side and provides real, significant compression.

---

## Technical Implementation

### Step 1: Update Compress.tsx Imports
Add pdfjs-dist imports for rendering pages (following the pattern already used in `PdfPageThumbnails.tsx`).

### Step 2: Create Image Compression Helper
```text
Function: compressImageToJpeg(canvas, quality)
- Takes a canvas with rendered PDF page
- Returns compressed JPEG data URL
- Quality parameter: 0.9 (high), 0.6 (medium), 0.3 (low)
```

### Step 3: Rewrite Compression Logic
```text
New compressPdf() flow:
1. Load PDF with pdfjs-dist
2. For each page:
   a. Render to canvas at appropriate scale
   b. Convert canvas to JPEG with quality setting
   c. Embed JPEG into new pdf-lib document
3. Save the new PDF document
4. Report size reduction
```

### Step 4: Quality Presets (Updated)
| Level | JPEG Quality | Render Scale | Expected Reduction |
|-------|-------------|--------------|-------------------|
| High | 0.85 | 2.0 | 20-40% |
| Medium | 0.60 | 1.5 | 40-60% |
| Low | 0.35 | 1.0 | 60-80% |

### Step 5: Add User Feedback
- Show estimated compression based on quality selected
- Update progress bar to reflect per-page processing
- Add warning that text may become non-selectable

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Compress.tsx` | Complete rewrite of compression logic |

---

## Key Code Changes

### Compression Function Structure
```text
async compressPdf():
  1. Load PDF with pdfjs-dist (for rendering)
  2. Create new PDFDocument with pdf-lib
  3. Loop through pages:
     - Get page from pdfjs
     - Create canvas with appropriate scale
     - Render page to canvas
     - Convert to JPEG blob with quality setting
     - Embed JPEG in new PDF
     - Add page with embedded image
  4. Save new PDF
  5. Calculate and display reduction
```

### Quality Settings
```text
high:   { quality: 0.85, scale: 2.0 }  // Good for printing
medium: { quality: 0.60, scale: 1.5 }  // Balanced
low:    { quality: 0.35, scale: 1.0 }  // Maximum compression
```

---

## Important Notes

- **Text becomes non-selectable**: Since pages are converted to images, text can no longer be selected or searched. A warning will be added to the UI.
- **Processing time**: Each page needs to be rendered and re-embedded, so large PDFs will take longer.
- **Browser-based**: All processing happens in the browser - no server uploads needed.

---

## UI Enhancements

1. Add descriptive text for each quality level showing expected compression
2. Add a note warning users that compressed PDFs will have image-based pages
3. Update progress to show per-page processing (e.g., "Processing page 3 of 10")

