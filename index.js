const express = require("express");
const JSZip = require("jszip");
const cors = require("cors");
const mm = require("music-metadata");
const app = express();
const NodeID3 = require("node-id3");
const { YouTube } = require("youtube-sr");
const ffmpeg = require("fluent-ffmpeg");
const sharp = require("sharp");
const ytdl = require("ytdl-core");
const { PassThrough } = require("stream");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const toStream = require("buffer-to-stream");
const { default: axios } = require("axios");
const { writeFileSync } = require("fs");

require("dotenv").config();
ffmpeg.setFfmpegPath(ffmpegPath);

app.use(cors());
app.use(express.json());

const BASE_YOUTUBE_URL = "https://www.youtube.com/watch?v=";

async function downloadThumbnail(thumbnailUrl) {
  const response = await fetch(thumbnailUrl);
  return await response.arrayBuffer();
}
function sendBufferAsChunks(buffer, res) {
  // Define the chunk size (you can adjust this according to your needs)
  const chunkSize = 1024; // 1 KB

  // Calculate the total number of chunks
  const totalChunks = Math.ceil(buffer.length / chunkSize);

  // Iterate over the buffer and send each chunk
  for (let i = 0; i < totalChunks; i++) {
    // Calculate the start and end indices for the current chunk
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, buffer.length);

    // Extract the current chunk
    const chunk = buffer.slice(start, end);

    // Send the chunk
    res.write(chunk);
  }

  // End the response after sending all chunks
  res.end();
}
async function downloadMusic(
  videoId,
  thumbnailUrl,
  dataCb,
  finishCb,
  responseCb,
  res,
  ID3Merge
) {
  try {
    console.log(ID3Merge);
    const info = await ytdl.getInfo(`${BASE_YOUTUBE_URL}${videoId}`);
    return new Promise((resolve, reject) => {
      const stream = ytdl.downloadFromInfo(info, {
        quality: "highest",
        filter: (format) => format.hasAudio && format.container === "mp4",
      });
      let totalLength = 0;
      let downloadedBytes = 0;
      const thumbnail =
        info.videoDetails.thumbnails[0].url ||
        info.videoDetails.thumbnail.thumbnails[0].url;
      const title = info.videoDetails.title;
      const author = info.videoDetails.author.name;
      stream.on("info", async (info, format) => {
        const response = await axios.head(format.url);
        console.log(format.url);
        totalLength = response.headers["content-length"];
        if (responseCb) responseCb(totalLength);
      });
      let ffmpegMergedBuffer = Buffer.alloc(0);
      const outputStream = new PassThrough();
      let outputOptions = ["-id3v2_version", "4"];
      const commandFfmpeg = ffmpeg();
      commandFfmpeg
        .input(stream)
        .audioBitrate(192)
        .withAudioCodec("libmp3lame")
        .toFormat("mp3")
        .outputOptions(...outputOptions)
        .on("error", (error) => {
          console.log(error);
        })
        .pipe(outputStream);
      outputStream.on("data", (chunk) => {
        ffmpegMergedBuffer = Buffer.concat([ffmpegMergedBuffer, chunk]);
        downloadedBytes += chunk.length;
        const progress = Math.min(downloadedBytes / totalLength) * 100;
        if (dataCb) dataCb(progress, chunk.length, chunk);
      });
      outputStream.on("finish", async () => {
        if (ID3Merge) {
          const thumbnailBuffer = await downloadThumbnail(thumbnail);
          const thumbnailJPEGBuffer = await sharp(thumbnailBuffer)
            .resize(640, 640)
            .toBuffer();
          const audioBuffer = NodeID3.write(
            {
              image: {
                type: { id: 3 },
                imageBuffer: thumbnailJPEGBuffer,
              },
              title,
              artist: author,
            },
            ffmpegMergedBuffer
          );
          if (finishCb) finishCb(audioBuffer);
          resolve({ fileSize: totalLength, buffer: audioBuffer });
        } else {
          console.log(ffmpegMergedBuffer.length);
          if (finishCb) finishCb(ffmpegMergedBuffer);
          resolve({ fileSize: totalLength, buffer: ffmpegMergedBuffer });
        }
      });
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
}

// Route to stream audio
app.get("/getMusic", async (req, res) => {
  try {
    const { name, thumbnailUrl } = req.query;
    if (!name) return res.status(400).json({ message: "Track id is missing" });
    const search = await YouTube.searchOne(name);
    const trackId = search.id;
    await downloadMusic(
      trackId,
      thumbnailUrl,
      (percent, chunkLength, chunk) => {
        res.write(chunk);
      },
      (buffer) => {
        console.log("end");
        res.end();
      },
      (totalBytes) => {
        console.log(totalBytes);
        res.set("Cache-Control", String(totalBytes));
      },
      res
    );
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
      const format = ytdl.chooseFormat(info.formats, {
        quality: "lowest",
        filter: (format) => format.container === "mp4",
      });
      const response = await axios.head(format.url);
      totalBytes += parseInt(response.headers["content-length"]);
      urls[trackName] = search.id;
    })
  );
  res.write(JSON.stringify({ totalBytes: `${totalBytes}` }));
  for (const trackName of tracksName) {
    const videoId = urls[trackName];
    const { buffer, fileSize } = await downloadMusic(
      videoId,
      null,
      (p, currentDownloadedBytes) => {
        if (currentDownloadedBytes) {
          console.log(currentDownloadedBytes);
          downloadedBytes += currentDownloadedBytes;
          console.log(downloadedBytes);
          const progress = Math.min((downloadedBytes / totalBytes) * 100);
          res.write(JSON.stringify({ downloadedBytes: progress }));
        }
      },
      null,
      null,
      null,
      true
    );
    urls[trackName] = { buffer };
  }
  const zipBuffer = await createZipFromBuffers(urls);
  sendBufferAsChunks(zipBuffer, res);
});

async function createZipFromBuffers(musicObject) {
  const zip = new JSZip();

  // Iterate over each key-value pair in the musicObject
  for (const [trackName, { buffer }] of Object.entries(musicObject)) {
    const title = (await mm.parseBuffer(Uint8Array.from(buffer))).common.title;
    zip.file(`${title || trackName}.mp3`, buffer);
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
