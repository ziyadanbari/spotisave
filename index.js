const express = require("express");
const JSZip = require("jszip");
const cors = require("cors");
const { existsSync, statSync, readFileSync, unlinkSync } = require("fs");
const { execSync } = require("child_process");
const mm = require("music-metadata");
const app = express();
app.use(cors());
app.use(express.json());

const YOUTUBE_MP3_API = "https://youtube-mp36.p.rapidapi.com/dl";
const YOUTUBE_API_HEADERS = {
  "X-RapidAPI-Key": "73cfd2a0ecmshbc5e01564a432abp1d656ajsn2878a3f3e2dc",
  "X-RapidAPI-Host": "youtube-mp36.p.rapidapi.com",
};

const TYPES = {
  playlist: "playlist",
  song: "track",
  album: "album",
};

async function downloadMusic(musicId, spotifyUrl, type = "song") {
  try {
    const musicName = `./audios/${musicId}.mp3`;
    const isExist = existsSync(musicName);
    if (isExist)
      return {
        link: `${process.env.BACKEND_URI}/getSong/${musicId}.mp3`,
        fileSize: statSync(`./audios/${musicId}.mp3`).size,
        path: `./audios/${musicId}.mp3`,
      };
    const command = `node ./lib/spotify-dl/cli.js https://open.spotify.com/${TYPES[type]}/${musicId}`;
    const result = execSync(command);
    return {
      link: `${process.env.BACKEND_URI}/getSong/${musicId}.mp3`,
      fileSize: statSync(`./audios/${musicId}.mp3`).size,
      path: `./audios/${musicId}.mp3`,
    };
  } catch (error) {
    console.log(error);
  }
}

app.get(`/getSong/:musicId`, async (req, res) => {
  try {
    const { musicId } = req.params;
    const musicDir = `./audios/${musicId}`;
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
    const { trackId } = req.query;
    if (!trackId)
      return res.status(400).json({ message: "Track id is missing" });
    const { link, fileSize } = await downloadMusic(trackId);
    return res.status(200).json({ link, filesize: fileSize });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/downloadPlaylist", async (req, res) => {
  const { tracksId } = req.body;
  let totalBytes = 0;
  let downloadedBytes = 0;
  const urls = {};
  await Promise.all([
    ...tracksId.map(async (trackId) => {
      const { link, fileSize, path } = await downloadMusic(trackId);
      urls[trackId] = path;
      totalBytes = totalBytes + parseInt(fileSize);
    }),
  ]);
  res.write(JSON.stringify({ totalBytes: String(totalBytes) }));
  const totalChunks = {};
  for (let trackId in urls) {
    const path = urls[trackId];
    const buffer = readFileSync(path);
    totalChunks[trackId] = { buffer, path };
  }
  const zipBuffer = await createZipFromBuffers(totalChunks);
  res.end(zipBuffer);
});

async function createZipFromBuffers(musicObject) {
  const zip = new JSZip();

  // Iterate over each key-value pair in the musicObject
  for (const [musicId, { buffer, path }] of Object.entries(musicObject)) {
    const title = (await mm.parseFile(path)).common.title;
    zip.file(`${title || musicId}.mp3`, buffer);
    // unlinkSync(path);
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
app.listen(process.env.PORT || PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
