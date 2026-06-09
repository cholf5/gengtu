# Product Requirement Document (PRD) - Open Source Meme Generator (Serverless)

## 1. Project Overview & Architecture

This is an open-source, fully client-side Meme Generator. It requires **no backend server, no database, and no API keys**. The entire application will be hosted as a static site (e.g., GitHub Pages, Vercel).

* **Core Principle**: Keep It Simple, Stupid (KISS).
* **Data Flow**: Driven entirely by localized JSON configuration files and images.
* **Contribution Model**: Users contribute new templates via a built-in Visual Template Editor, which generates a pre-filled GitHub URL to open a Pull Request (PR) directly on GitHub.

---

## 2. Core Workflows

### Workflow A: Meme Generation (User View)

1. User browses or searches built-in meme templates.
2. User selects a template $\rightarrow$ UI renders the image with overlayed input text fields.
3. User types text, adjusts styling (font size, color, font-family, uppercase toggle).
4. User clicks "Generate" $\rightarrow$ Application renders the final image on a HTML5 Canvas and triggers a browser download.

### Workflow B: Template Contribution (Creator View)

1. User enters `/create` or `/admin` route.
2. User uploads a local base image (handled via client-side `URL.createObjectURL`).
3. User interactively drags/resizes text boundary boxes on top of the image to define where meme text should go.
4. User clicks "Submit Template" $\rightarrow$ System generates a standardized JSON payload and opens a new browser tab with a pre-formatted GitHub `new file` URL, facilitating an instant PR.

---

## 3. Detailed Feature Requirements

### Feature 1: Home & Gallery View

* **Grid Layout**: Display available meme templates using cards (Image + Title).
* **Search / Filter**: Client-side fuzzy search by template name or tags.
* **Responsive Design**: Mobile-friendly grid system (1 column on mobile, 3–4 columns on desktop).

### Feature 2: Meme Workspace (Editor)

* **Canvas / Preview Area**: Displays the active meme template. Text should overlay on top of the image dynamically as the user types.
* **Form Controls**:
* Dynamic list of input fields mapping to the template's designated text fields.
* **Global/Per-field Text Options**: Font Size slider ($20\text{px} - 100\text{px}$), Color Picker, Font-Family selector (include classic meme fonts like *Impact*, *Arial*, and a heavy Sans-Serif font).
* **Uppercase Switch**: A toggle button. If enabled, automatically transform English inputs via `.toUpperCase()` before rendering.


* **Download Button**: Re-draws the image + text onto an offscreen HTML5 Canvas at full original resolution, then triggers a client-side `.png` or `.jpg` download.

### Feature 3: Visual Template Configurator (The `/create` Tool)

* **Local Image Uploader**: Drag-and-drop zone to load any image file strictly into browser memory.
* **Visual Drag & Drop Layer**:
* Integrate a library like `react-rnd` or native draggable handlers.
* Allow users to add a text field bounding box.
* Users can move (adjust $X, Y$ percentages or absolute values) and resize (adjust $Width, Height$) the box.
* Set default styles for that specific field (e.g., Default Text, Default Font Size, Text Alignment).


* **JSON Generator**: Automatically updates a live-preview JSON schema string matching the format defined in Section 4.

### Feature 4: Path A "One-Click PR" Generator

* **Action**: Clicking "Submit to GitHub" executes a clean URL redirection.
* **Logic**:
1. Serialize the generated JSON config into a string.
2. URL-encode the payload (`encodeURIComponent`).
3. Format a GitHub URL targeting the project repo using the file creation endpoint.


* **URL Spec**:

```text
https://github.com/cholf5/open-meme/new/main/src/memes/?filename=<TEMPLATE_ID>.json&value=<URL_ENCODED_JSON_STRING>
```

* **UI Notice**: Display a friendly modal explaining to the user: *"You will be redirected to GitHub to commit this configuration. Please drag and drop your meme image file into the same directory on GitHub before finalizing your Pull Request!"*

---

## 4. Technical Specifications & Data Models

### Template JSON Schema
Every meme template must follow this structure inside `src/memes/`:

```json
{
  "id": "two-buttons",
  "name": "Two Buttons (抉择两难)",
  "url": "/memes/two_buttons.jpg",
  "tags": ["classic", "choice"],
  "textFields": [
    {
      "id": "text_left",
      "placeholder": "Option A",
      "x": 80,
      "y": 320,
      "width": 120,
      "height": 60,
      "fontSize": 24,
      "color": "#000000",
      "align": "center"
    },
    {
      "id": "text_right",
      "placeholder": "Option B",
      "x": 220,
      "y": 320,
      "width": 120,
      "height": 60,
      "fontSize": 24,
      "color": "#000000",
      "align": "center"
    }
  ]
}

```

### Canvas Rendering Constraints

* Text rendering **must support multi-line wrap** bounded by the `width` and `height` parameters specified in the JSON.
* Text strokes/outlines: Standard memes use white text with a thick black outline. Add text-shadow or canvas stroke options:

```javascript
ctx.strokeStyle = '#000000';
ctx.lineWidth = 4;
ctx.fillStyle = '#ffffff';
```

---

## 5. Non-Functional Requirements (Agent Guardrails)
* **Zero Server Dependency**: Do not attempt to install or use packages like `express`, `mongoose`, `prisma`, or any external file-upload microservices.
* **Bundle Optimization**: Lazy-load built-in meme templates or web fonts to keep initial load times minimal.
* **Component Framework**: Use clean React components with standard CSS/Tailwind. Do not over-engineer the states. Follow the **KISS** architecture pattern.


## 6. CI/CD & Automated Workflows
* **Deployment**: Configure a GitHub Action (`.github/workflows/deploy.yml`) to automatically build and deploy the React/Vite app to **GitHub Pages** whenever code is merged into the `main` branch.
* **Template Validation**: Add a pre-commit hook or a lightweight GitHub Action to validate any new JSON file submitted to `src/memes/`. It must strictly conform to the JSON Schema provided in Section 4 (ensuring required fields like `id`, `url`, and `textFields` are present and valid) to prevent broken PRs from crashing the gallery.


## 7. Asset Management
* All built-in meme background images must be placed in `public/memes/`.
* Images should be optimized/compressed (e.g., standard `.jpg` or `.webp`, resolution width bounded within $800\text{px} - 1200\text{px}$) to maintain blazing-fast, serverless page loads.
