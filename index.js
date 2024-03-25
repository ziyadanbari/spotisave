const express = require("express");
const JSZip = require("jszip");
const cors = require("cors");
const { existsSync, readFileSync, unlinkSync, writeFileSync } = require("fs");
const mm = require("music-metadata");
const app = express();
const YoutubeMp3Downloader = require("youtube-mp3-downloader");
const NodeID3 = require("node-id3");
const { YouTube } = require("youtube-sr");
const { setFfmpegPath } = require("fluent-ffmpeg");
const sharp = require("sharp");
const ytdl = require("ytdl-core");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
require("dotenv").config();
setFfmpegPath(ffmpegPath);
app.use(cors());
app.use(express.json());

const YD = new YoutubeMp3Downloader({
  ffmpegPath: ffmpegPath, // FFmpeg binary location
  youtubeVideoQuality: "highestaudio", // Desired video quality (default: highestaudio)
  queueParallelism: 2, // Download parallelism (default: 1)
  progressTimeout: 2000, // Interval in ms for the progress reports (default: 1000)
  allowWebm: false, // Enable download from WebM sources (default: false)
  outputPath: "./audios",
});

async function downloadThumbnail(thumbnailUrl) {
  const response = await fetch(thumbnailUrl);
  return await response.arrayBuffer();
}

async function downloadMusic(videoId, filename, progressCb, thumbnailUrl) {
  try {
    console.log(videoId);
    console.log(thumbnailUrl);
    return new Promise((resolve, reject) => {
      YD.download(videoId, filename);
      if (progressCb) YD.on("progress", progressCb);
      YD.on("finished", async (error, info) => {
        console.log(info);
        const thumbnailBufferPNG = await downloadThumbnail(
          thumbnailUrl || info.thumbnail
        );
        const thumbnailBufferJPEG = await sharp(thumbnailBufferPNG)
          .toFormat("jpeg")
          .resize(640, 640)
          .toBuffer();
        console.log(thumbnailBufferJPEG);
        NodeID3.write(
          {
            image: {
              imageBuffer: thumbnailBufferJPEG,
              mime: "image/jpeg",
              type: { id: 3, name: "front cover" },
            },
          },
          readFileSync(info.file),
          (err, buffer) => {
            writeFileSync(info.file, buffer);
            const fileBuffer = readFileSync(info.file);
            resolve({
              buffer: fileBuffer,
              fileSize: info.stats.transferredBytes,
              path: info.file,
              url: `${process.env.BACKEND_URI}/getSong/${info.file.split("/").slice(-1)[0]}`,
            });
          }
        );
      });
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
}

app.get(`/getSong/:musicId`, async (req, res) => {
  try {
    const { musicId } = req.params;
    console.log(musicId);
    const musicDir = `./audios/${musicId}`;
    console.log(musicDir);
    const isExist = existsSync(musicDir);
    if (!isExist) throw [404, "Music not found"];
    const buffer = readFileSync(musicDir);
    res.setHeader("Content-Type", "audio/mp3");
    res.send(buffer);
    unlinkSync(musicDir);
  } catch (error) {
    console.log(error);
    res.status(error[0] || 500).json({ message: error.toString() });
  }
});

// Route to stream audio
app.get("/getMusic", async (req, res) => {
  try {
    const { name, thumbnailUrl } = req.query;
    if (!name) return res.status(400).json({ message: "Track id is missing" });
    const search = await YouTube.searchOne(name);
    const trackId = search.id;
    const { buffer, fileSize, url } = await downloadMusic(
      trackId,
      `${name}.mp3`,
      ({ progress }) => {
        res.write(JSON.stringify({ totalBytes: `${progress.length}` }));
        res.write(JSON.stringify({ downloadedBytes: progress.percentage }));
      },
      thumbnailUrl
    );
    return res.end(JSON.stringify({ url }));
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: error.toString() });
  }
});

app.post("/downloadPlaylist", async (req, res) => {
  const { tracksName } = req.body;
  let totalBytes = 0;
  let downloadedBytes = 0;
  let urls = {};
  await Promise.all(
    tracksName.map(async (trackName) => {
      const search = await YouTube.searchOne(trackName);
      const info = await ytdl.getInfo(search.url);
      const audioLength = ytdl.chooseFormat(info.formats, {
        filter: "audioonly",
        quality: "highestaudio",
      }).contentLength;
      totalBytes += parseInt(audioLength);
      const videoId = search.id;
      urls[trackName] = videoId;
    })
  );
  res.write(JSON.stringify({ totalBytes: `${totalBytes}` }));
  for (const trackName of tracksName) {
    const videoId = urls[trackName];
    const { buffer, fileSize, path } = await downloadMusic(
      videoId,
      `${trackName}.mp3`,
      ({ progress }) => {
        res.write(
          JSON.stringify({
            downloadedBytes: Math.min(
              ((downloadedBytes + progress.transferred) / totalBytes) * 100
            ),
          })
        );
      }
    );
    downloadedBytes += fileSize;
    urls[trackName] = { buffer, path };
  }
  console.log(urls);
  const zipBuffer = await createZipFromBuffers(urls);
  res.end(zipBuffer);
});

async function createZipFromBuffers(musicObject) {
  const zip = new JSZip();

  // Iterate over each key-value pair in the musicObject
  for (const [trackName, { buffer, path }] of Object.entries(musicObject)) {
    const title = (await mm.parseBuffer(new Uint8Array.from(buffer))).common
      .title;
    zip.file(`${title || trackName}.mp3`, buffer);
    unlinkSync(path);
  }

  // Generate the zip buffer
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  return zipBuffer;
}

// Start the Express server
const PORT = 4000;
app.listen(process.env.PORT || PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
