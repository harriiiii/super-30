import crypto from 'crypto';
import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary'; // <-- ADDED THIS

// 1. Configure Cloudinary (Make sure these are in your .env file)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 2. Change UPLOADS_DIR to a TEMP_DIR (We will delete files from here after upload)
const TEMP_DIR = path.resolve(__dirname, '../../temp_uploads');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEMP_DIR),
  filename: (_req, file, cb: any) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb: any) => {
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (mp4, webm, mov, avi, mkv)'));
    }
  },
});

const router = Router();

// POST: Upload Video
router.post('/video', upload.single('video'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  try {
    // 3. Upload to Cloudinary
    const result = await cloudinary.uploader.upload_large(req.file.path, {
      resource_type: 'video',
      folder: 'super30_practice_videos',
      chunk_size: 20 * 1024 * 1024, // 20  MB chunks, keeps your dashboard organized
    }) as any;

    // 4. Delete the temporary file from your server
    fs.unlinkSync(req.file.path);

    // 5. Return Cloudinary data to frontend
    res.status(201).json({
      url: result.secure_url, // LIVE Cloudinary URL
      filename: result.public_id, // We use public_id as the new filename for easy deletion later
      size: result.bytes,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    // Ensure we delete the temp file even if the upload fails
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Failed to upload video to cloud' });
  }
});

// GET: List uploaded videos (Fetches from Cloudinary now)
router.get('/videos', async (_req, res) => {
  try {
    const result = await cloudinary.search
      .expression('folder:super30_practice_videos AND resource_type:video')
      .sort_by('created_at', 'desc')
      .max_results(30)
      .execute();

    const files = result.resources.map((file: any) => ({
      filename: file.public_id,
      url: file.secure_url,
      size: file.bytes,
      uploadedAt: file.created_at,
    }));

    res.json(files);
  } catch (error) {
    console.error('Cloudinary Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// DELETE: Delete a video from Cloudinary
router.delete('/videos/:filename(*)', async (req, res) => {
  try {
    const publicId = req.params.filename; // e.g., 'super30_practice_videos/12345'
    
    if (!publicId) {
      res.status(400).json({ error: 'No filename provided' });
      return;
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    
    if (result.result === 'ok') {
      res.status(204).end();
    } else {
      res.status(404).json({ error: 'File not found in cloud' });
    }
  } catch (error) {
    console.error('Cloudinary Delete Error:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

export default router;