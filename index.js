const express = require("express");
const ytdl = require("ytdl-core");
const { default: YouTube } = require("youtube-sr");
const JSZip = require("jszip");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// Route to stream audio
app.get("/getMusic", async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ message: "Name missing" });

    const result = await YouTube.searchOne(name);
    const videoURL = result.url;
    if (!videoURL) return res.status(400).json({ message: "Music not found" });
    const info = await ytdl.getInfo(videoURL);
    const audioFormat = info.formats.find(
      (format) => format.hasAudio && !format.hasVideo
    );

    if (!audioFormat) {
      throw new Error("No audio format found");
    }

    const audio = ytdl(videoURL, {
      filter: "audioonly",
      quality: "lowest",
    });

    let downloadedBytes = 0;
    let totalBytes = parseInt(audioFormat.contentLength);
    const chunks = [];
    audio.on("data", (chunk) => {
      downloadedBytes += chunk.length;
      const progress = (downloadedBytes / totalBytes) * 100;
      res.write(`progress: ${progress}`);
      chunks.push(chunk);
    });

    audio.on("end", () => {
      const data = Buffer.concat(chunks);
      res.write(data);
      res.end();
    });

    // Handle errors
    audio.on("error", (error) => {
      console.error("Video stream error:", error);
      res.status(500).end();
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/downloadPlaylist", async (req, res) => {
  const { names } = req.body;
  let totalBytes = 0;
  let downloadedBytes = 0;
  const urls = {};
  await Promise.all([
    ...names.map(async (name) => {
      const result = await YouTube.searchOne(name);
      const videoURL = result?.url;
      urls[name] = videoURL;
      if (!videoURL) return console.log("url not found");
      const info = await ytdl.getInfo(videoURL);
      const audioFormat = info.formats.find(
        (format) => format.hasAudio && !format.hasVideo
      );
      if (!audioFormat) {
        throw new Error("No audio format found");
      }
      totalBytes = totalBytes + parseInt(audioFormat.contentLength);
    }),
  ]);
  const totalChunks = {};
  for (let name in urls) {
    const url = urls[name];
    const chunks = [];
    const audio = ytdl(url, { filter: "audio", quality: "lowest" });
    audio.on("data", (chunk) => {
      chunks.push(chunk);
      downloadedBytes += chunk.length;
      const progress = (downloadedBytes / totalBytes) * 100;
      console.log(progress);
      res.write(`progress: ${progress}`);
    });
    audio.on("end", () => {
      totalChunks[name] = chunks;
      const keys = Object.keys(urls);
      const isTheLast = keys.indexOf(name) === keys.length - 1;
      if (isTheLast) {
        createZipFromBuffers(totalChunks).then((zipBuffer) => {
          res.write(zipBuffer);
          res.end();
        });
      }
    });
  }
});

async function createZipFromBuffers(musicObject) {
  const zip = new JSZip();

  // Iterate over each key-value pair in the musicObject
  for (const [musicName, chunks] of Object.entries(musicObject)) {
    const buffer = Buffer.concat(chunks);
    zip.file(`${musicName}.mp3`, buffer);
  }

  // Generate the zip buffer
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return zipBuffer;
}

// Start the Express server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
