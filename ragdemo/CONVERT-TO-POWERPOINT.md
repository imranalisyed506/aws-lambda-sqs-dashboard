# Converting Presentation to PowerPoint

This guide explains how to convert the provided presentation materials to PowerPoint format.

## Option 1: View HTML Presentation (Recommended)

The easiest way to present is using the **interactive HTML version**:

1. Open `presentation.html` in your web browser
2. Use arrow keys or click to navigate slides
3. Press `F` for fullscreen mode
4. Press `Esc` to exit fullscreen
5. Press `S` for speaker notes (if added)

**Benefits:**
- Professional look with animations
- No conversion needed
- Works on any device with a browser
- Can present directly or share the HTML file

## Option 2: Convert Markdown to PowerPoint

### Using Pandoc (Cross-platform)

**Install Pandoc:**
- macOS: `brew install pandoc`
- Windows: Download from https://pandoc.org/installing.html
- Linux: `sudo apt-get install pandoc`

**Convert to PowerPoint:**

```bash
pandoc PRESENTATION.md -o presentation.pptx
```

**With custom template:**

```bash
pandoc PRESENTATION.md -o presentation.pptx --reference-doc=template.pptx
```

### Using Online Tools

1. **Markdown to Slides**
   - Visit: https://www.markdowntoslides.com/
   - Paste content from `PRESENTATION.md`
   - Export as PowerPoint

2. **HackMD**
   - Visit: https://hackmd.io/
   - Create new note, paste `PRESENTATION.md`
   - Switch to "Slide Mode"
   - Use print/download options

3. **Marp**
   - Visit: https://marp.app/
   - Paste markdown content
   - Export as PowerPoint or PDF

## Option 3: Manual Copy to PowerPoint

If you prefer full control:

1. Open PowerPoint and create a new presentation
2. Open `PRESENTATION.md` in a text editor
3. Each `---` separator represents a new slide
4. Copy content between separators to PowerPoint slides
5. Format as desired (fonts, colors, layouts)

### Suggested PowerPoint Formatting

- **Title Slide**: Use "Title Slide" layout
- **Section Headers**: Use "Section Header" layout
- **Content Slides**: Use "Title and Content" layout
- **Code Blocks**: Use monospace font (Consolas or Courier New)
- **Tables**: Copy to PowerPoint tables for better formatting
- **Lists**: Use PowerPoint bullet points

## Option 4: Export HTML Presentation to PDF

If you need a PDF for sharing:

1. Open `presentation.html` in Chrome or Edge
2. Press `Ctrl/Cmd + P` to print
3. Select "Save as PDF"
4. Choose "Landscape" orientation
5. Save the PDF

Then import PDF slides into PowerPoint:
- PowerPoint → Insert → Object → From File → Select PDF

## Customization Tips

### For Markdown Version (PRESENTATION.md)

Add Pandoc metadata at the top:

```yaml
---
title: Local Docs RAG System
author: Your Name
date: March 2026
theme: metropolis
---
```

### For HTML Version (presentation.html)

Change theme by editing this line:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.6.0/dist/theme/black.css">
```

Available themes: `black`, `white`, `league`, `beige`, `sky`, `night`, `serif`, `simple`, `solarized`

### Adding Speaker Notes

In `PRESENTATION.md`, add notes like this:

```markdown
## Slide Title

Slide content here...

::: notes
These are speaker notes that won't appear on the slide.
:::
```

## Presentation Assets

Included files:

- **PRESENTATION.md** - Markdown source (for conversion)
- **presentation.html** - Interactive HTML version (ready to present)
- **CONVERT-TO-POWERPOINT.md** - This guide

## Recommended Workflow

**For Live Presentation:**
1. Use `presentation.html` directly
2. Open in browser, press F11 for fullscreen
3. Use arrow keys to navigate

**For Sharing:**
1. Export HTML to PDF (as described above)
2. Or convert Markdown to PowerPoint with Pandoc
3. Share the file via email or cloud storage

**For Customization:**
1. Edit `PRESENTATION.md` for content changes
2. Edit `presentation.html` for styling changes
3. Regenerate/refresh as needed

## Need Help?

Common issues:

- **Pandoc not found**: Make sure it's installed and in your PATH
- **Formatting issues**: Use a reference template with `--reference-doc`
- **Images not showing**: Use absolute paths or base64 encoded images
- **Code blocks broken**: Ensure proper code fencing with triple backticks

## Quick Start Commands

```bash
# View HTML presentation
open presentation.html  # macOS
start presentation.html # Windows
xdg-open presentation.html # Linux

# Convert to PowerPoint (requires Pandoc)
pandoc PRESENTATION.md -o presentation.pptx

# Convert with custom template
pandoc PRESENTATION.md -o presentation.pptx --reference-doc=your-template.pptx

# Print to PDF from command line (requires wkhtmltopdf)
wkhtmltopdf presentation.html presentation.pdf
```

---

**Ready to present!** 🎉

Choose your preferred method and share your Local Docs RAG System project with confidence.
