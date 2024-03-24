import { existsSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const { setFfmpegPath } = pkg;
setFfmpegPath(ffmpegPath);

const TYPES = {
  playlist: "playlist",
  song: "track",
  album: "album",
};

downloadMusic("1xoihDwlYtJng4HbqUlMIz");
