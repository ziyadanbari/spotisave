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

require("dotenv").config();
ffmpeg.setFfmpegPath(ffmpegPath);

app.use(
  cors({
    origin: "https://spotisave.vercel.app/",
  })
);
app.use(express.json());

const BASE_YOUTUBE_URL = "https://www.youtube.com/watch?v=";

async function downloadThumbnail(thumbnailUrl) {
  const response = await fetch(thumbnailUrl);
  return await response.arrayBuffer();
}

async function downloadMusic(
  videoId,
  thumbnailUrl,
  dataCb,
  finishCb,
  responseCb,
  res
) {
  try {
    const info = await ytdl.getInfo(`${BASE_YOUTUBE_URL}${videoId}`);
    return new Promise((resolve, reject) => {
      const stream = ytdl.downloadFromInfo(info, {
        quality: "lowest",
        filter: (format) => format.container === "mp4",
      });

      let totalLength = 0;
      let downloadedBytes = 0;
      const thumbnail =
        info.videoDetails.thumbnails[0].url ||
        info.videoDetails.thumbnail.thumbnails[0].url;
      const title = info.videoDetails.title;
      const author = info.videoDetails.author.name;

      let mergedBuffer = Buffer.alloc(0);
      stream.on("info", async (info, format) => {
        const response = await axios.head(format.url);
        totalLength = response.headers["content-length"];
        if (responseCb) responseCb(totalLength);
      });
      stream.on("data", (chunk) => {
        mergedBuffer = Buffer.concat([mergedBuffer, chunk]);
        downloadedBytes += chunk.length;
        const progress = Math.min(downloadedBytes / totalLength) * 100;
        if (dataCb) dataCb(progress, chunk.length);
      });
      stream.on("end", () => {
        const streamBuffer = toStream(mergedBuffer);
        let ffmpegMergedBuffer = Buffer.alloc(0);
        const outputStream = new PassThrough();
        let outputOptions = ["-id3v2_version", "4"];
        const commandFfmpeg = ffmpeg();
        commandFfmpeg
          .input(streamBuffer) // Use PassThrough stream as input
          .audioBitrate(192)
          .withAudioCodec("libmp3lame")
          .toFormat("mp3")
          .outputOptions(...outputOptions)
          .on("error", (error) => {
            console.log(error);
          })
          .on("", () => {
            console.log("end");
          })
          .pipe(outputStream);
        outputStream.on("data", (chunk) => {
          ffmpegMergedBuffer = Buffer.concat([ffmpegMergedBuffer, chunk]);
        });
        outputStream.on("finish", async () => {
          const thumbnailBuffer = await downloadThumbnail(thumbnail);
          const thumbnailJPEGBuffer = await sharp(thumbnailBuffer)
            .toFormat("jpeg")
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
        });
      });
    });
  } catch (error) {
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
      (percent) => res.write(JSON.stringify({ downloadedBytes: percent })),
      (buffer) => {
        res.end(buffer);
      },
      (totalBytes) => res.write(JSON.stringify({ totalBytes })),
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
  console.log(totalBytes);
  res.write(JSON.stringify({ totalBytes: `${totalBytes}` }));
  for (const trackName of tracksName) {
    const videoId = urls[trackName];
    const { buffer, fileSize } = await downloadMusic(
      videoId,
      `${trackName}.mp3`,
      (p, currentDownloadedBytes) => {
        if (currentDownloadedBytes) {
          console.log(currentDownloadedBytes);
          downloadedBytes += currentDownloadedBytes;
          console.log(downloadedBytes);
          const progress = Math.min((downloadedBytes / totalBytes) * 100);
          res.write(JSON.stringify({ downloadedBytes: progress }));
        }
      },
      null
    );
    urls[trackName] = { buffer };
  }
  const zipBuffer = await createZipFromBuffers(urls);
  res.end(zipBuffer);
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
