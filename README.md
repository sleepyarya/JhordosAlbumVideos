# JRD Album - Personal Video Collection

Personal video album website with neon purple styling, sorting, pagination, canvas-based custom FPS control, resolution selection, and a 3D book flip intro.

## Setup & Running Locally

Because video files are large, they are not stored on GitHub (excluded via `.gitignore`). To run the project locally after cloning:

1. **Create a `videos` folder** in the root directory of this project:
   ```bash
   mkdir videos
   ```
2. **Place your `.mp4` video files** inside the `videos` directory.
3. **Run the development server**:
   ```bash
   npm run dev
   ```

*Note: You do not need to run `npm install` because the project doesn't use any external npm dependencies (it uses native Node.js APIs, and the dev server runs dynamically via `npx serve`).*

### How it works under the hood:
* **Auto-scan**: `npm run dev` automatically scans the `videos/` folder and generates `videos.json` on startup.
* **Hot-reload metadata**: A file watcher will monitor the `videos/` folder. If you add, rename, or delete any `.mp4` files, the metadata will update automatically in real-time.

