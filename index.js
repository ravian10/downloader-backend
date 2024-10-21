const express = require("express");
const cors = require("cors");
const ytdl = require("ytdl-core");
const app = express();
const port = process.env.PORT || 4000;

// Enable CORS
app.use(cors({ origin: 'https://downloader-frontend-r7c5pylbg-munir-akbars-projects.vercel.app', // Replace with your actual frontend URL
    methods: ['GET', 'POST'], }));
app.use(express.json());

// Helper function to convert shortened URLs to full YouTube URLs
function expandShortenedUrl(url) {
  if (url.startsWith("https://youtu.be/")) {
    const videoId = url.split("youtu.be/")[1].split("?")[0]; // Extract video ID
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  return url; // If it's not a shortened URL, return the original URL
}

// Fetch video info
app.post("/api/video", async (req, res) => {
  const videoUrl = req.body.url;

  // Expand shortened URL to full URL
  const fullUrl = expandShortenedUrl(videoUrl);

  try {
    const isValidUrl = ytdl.validateURL(fullUrl);
    if (!isValidUrl) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    // Get video info
    const info = await ytdl.getInfo(fullUrl);

    // Filter formats to only include unique MP4 qualities
    const mp4Formats = info.formats
      .filter((format) => format.container === "mp4" && format.qualityLabel)
      .reduce((unique, format) => {
        if (!unique.some((f) => f.qualityLabel === format.qualityLabel)) {
          unique.push({
            quality: format.qualityLabel,
            itag: format.itag, // Pass itag to identify format for downloading
          });
        }
        return unique;
      }, []);

    const videoDetails = {
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails[0].url,
      formats: mp4Formats, // Now only unique MP4 formats with one button per quality
    };

    res.json(videoDetails);
  } catch (error) {
    console.error("Error fetching video details:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch video details. Please try again." });
  }
});

// Route to download the video through the backend
app.get("/api/download", async (req, res) => {
  const { url, itag } = req.query; // Extract URL and itag from query params

  // Expand shortened URL to full URL
  const fullUrl = expandShortenedUrl(url);

  if (!ytdl.validateURL(fullUrl)) {
    return res.status(400).send("Invalid YouTube URL");
  }

  try {
    // Get video info and stream the video
    const videoStream = ytdl(fullUrl, {
      filter: (format) => format.itag == itag,
    });

    // Set headers for file download
    res.header("Content-Disposition", 'attachment; filename="video.mp4"');
    res.header("Content-Type", "video/mp4");

    // Pipe the video stream directly to the response
    videoStream.pipe(res);

    // Handle stream errors (optional, but helps in debugging)
    videoStream.on("error", (err) => {
      console.error("Error downloading the video:", err);
      res.status(500).send("Error downloading the video");
    });
  } catch (error) {
    console.error("Error downloading video:", error);
    res.status(500).send("Error downloading the video");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
