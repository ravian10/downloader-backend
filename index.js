const express = require("express");
const cors = require("cors");
const ytdl = require("ytdl-core");

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint to fetch video info
app.post("/api/video", async (req, res) => {
  const { url } = req.body;
  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    const videoInfo = await ytdl.getInfo(url);
    const formats = videoInfo.formats
      .filter((f) => f.container === "mp4")
      .map((f) => ({
        quality: f.qualityLabel,
        itag: f.itag,
        url: f.url,
      }));

    res.json({
      title: videoInfo.videoDetails.title,
      thumbnail: videoInfo.videoDetails.thumbnails[0].url,
      formats,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch video info" });
  }
});

// Endpoint to download video
app.get("/api/download", (req, res) => {
  const { url, itag } = req.query;
  res.header("Content-Disposition", 'attachment; filename="video.mp4"');
  ytdl(url, { filter: (format) => format.itag == itag }).pipe(res);
});

// Run the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
