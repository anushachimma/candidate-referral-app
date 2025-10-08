import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const DB_FILE = path.join(__dirname, "db.json");

// Ensure db.json exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeJsonSync(DB_FILE, []);
}

// File upload config (PDF only)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueName);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"));
    }
  },
});

// Get all candidates
app.get("/candidates", async (req, res) => {
  try {
    const data = await fs.readJson(DB_FILE);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to read database." });
  }
});

// Add new candidate
app.post("/candidates", upload.single("resume"), async (req, res) => {
  try {
    const { name, email, phone, jobTitle } = req.body;
    if (!name || !email || !phone || !jobTitle) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const data = await fs.readJson(DB_FILE);
    const newCandidate = {
      id: Date.now().toString(),
      name,
      email,
      phone,
      jobTitle,
      resumeUrl: req.file ? `/uploads/${req.file.filename}` : null,
      status: "Pending",
    };
    data.push(newCandidate);
    await fs.writeJson(DB_FILE, data, { spaces: 2 });
    res.json(newCandidate);
  } catch (err) {
    res.status(500).json({ error: "Failed to add candidate." });
  }
});

// Update candidate status
app.put("/candidates/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const data = await fs.readJson(DB_FILE);
    const idx = data.findIndex((c) => c.id === id);
    if (idx === -1) return res.status(404).json({ error: "Candidate not found." });
    data[idx].status = status;
    await fs.writeJson(DB_FILE, data, { spaces: 2 });
    res.json(data[idx]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update status." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
