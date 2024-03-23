const express = require("express");
const ytdl = require("ytdl-core");
const { default: YouTube } = require("youtube-sr");
const JSZip = require("jszip");
const cors = require("cors");
const { default: axios } = require("axios");
const { writeSync, writeFileSync } = require("fs");
const app = express();

app.use(cors());
app.use(express.json());

const YOUTUBE_MP3_API = "https://youtube-mp36.p.rapidapi.com/dl";
const YOUTUBE_API_HEADERS = {
  "X-RapidAPI-Key": "73cfd2a0ecmshbc5e01564a432abp1d656ajsn2878a3f3e2dc",
  "X-RapidAPI-Host": "youtube-mp36.p.rapidapi.com",
};

// Route to stream audio
app.get("/getMusic", async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ message: "Name missing" });

    const result = await YouTube.searchOne(name);
    const videoId = result.id;
    if (!videoId) return res.status(400).json({ message: "Music not found" });
    const { link, filesize } = (
      await axios.get(`${YOUTUBE_MP3_API}?id=${videoId}`, {
        headers: { ...YOUTUBE_API_HEADERS },
      })
    ).data;
    return res.status(200).json({ link, filesize });
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
      const videoID = result?.id;
      const { link, filesize } = (
        await axios.get(`${YOUTUBE_MP3_API}?id=${videoID}`, {
          headers: { ...YOUTUBE_API_HEADERS },
        })
      ).data;
      urls[name] = link;
      totalBytes = totalBytes + parseInt(filesize);
    }),
  ]);
  res.write(JSON.stringify({ totalBytes: String(totalBytes) }));
  const totalChunks = {};
  for (let name in urls) {
    const downloadUrl = urls[name];
    const response = await fetch(downloadUrl);
    const reader = response.body.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        totalChunks[name] = chunks;
        break;
      }
      downloadedBytes += value.length;
      await sendProgress(res, { downloadedBytes });
      chunks.push(value);
    }
  }
  const zipBuffer = await createZipFromBuffers(totalChunks);
  const chunkSize = 500 * 1024; // 1MB chunk size
  for (let i = 0; i < zipBuffer.length; i += chunkSize) {
    const chunk = zipBuffer.slice(i, i + chunkSize);
    res.write(chunk);
  }
  res.end();
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

async function sendProgress(res, data) {
  return new Promise((resolve, reject) => {
    res.write(JSON.stringify(data) + "\n", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Start the Express server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
