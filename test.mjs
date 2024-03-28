import ffmpeg from "fluent-ffmpeg";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
ffmpeg.setFfmpegPath(ffmpegPath);

const command = ffmpeg("./videoplayback.weba")
  .toFormat("mp3")
  .saveToFile("./test.mp3")
  .run();
