import { useState } from "react";
import { Button } from "./ui/button";
import { backendUrl } from "@/exports";
import { ID3Writer } from "browser-id3-writer";
import axios from "axios";

export default function DownloadButton({
  playListName,
  name,
  text,
  avatar,
  artistName,
  id,
}: {
  playListName?: string;
  name: string[] | string;
  text?: string;
  avatar?: string;
  artistName?: string;
  id: string | string[] | number;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<number | null>(0);

  const downloadSingleAudio = async () => {
    const { link: downloadLink, filesize } = (
      await axios.get<{ link: string; filesize: number }>(
        `${backendUrl}/getMusic?trackId=${id}`
      )
    ).data;
    const total = filesize || 0;
    const response = await fetch(downloadLink);
    if (!response || !response.body) return;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalDownloadedBytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        setIsLoading(false);
        break;
      }
      chunks.push(value);
      totalDownloadedBytes += value.length;
      const progress = Math.trunc((totalDownloadedBytes / total) * 100);
      setProgress(progress);
    }
    const mergedBuffer = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      mergedBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    const blob = new Blob([mergedBuffer], { type: "audio/mp3" });
    const url = URL.createObjectURL(blob);

    // Create a link element to trigger the download
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}.mp3`;

    // Programmatically click the link to start the download
    document.body.appendChild(link);
    link.click();

    // Cleanup: remove the link and revoke the URL
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    setProgress(0);
  };

  function extractTotalBytes(string: string) {
    const regex = /"totalBytes"\s*:\s*"(\d+)"/;
    const match = regex.exec(string);
    if (match) {
      return parseInt(match[1]);
    } else {
      return null;
    }
  }
  function extractDownloadedBytes(string: string) {
    const regex = /"downloadedBytes"\s*:\s*(\d+)/;
    const match = string.match(regex);

    if (match && match[1]) {
      const downloadedBytesValue = parseInt(match[1]);
      return downloadedBytesValue;
    } else {
      console.log("Value not found");
      return null;
    }
  }

  const downloadPlaylist = async () => {
    try {
      const response = await fetch(`${backendUrl}/downloadPlaylist`, {
        method: "post",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tracksId: id }),
      });
      if (!response.ok || !response.body) {
        throw response.statusText;
      }

      // Here we start prepping for the streaming response
      const reader = response.body.getReader();
      let mergedBuffer = Buffer.alloc(0);
      let totalLength = 0;
      const decoder = new TextDecoder("utf-8");
      while (true) {
        const { value, done } = await reader.read();
        const decodedChunk = decoder.decode(value, { stream: true });
        if (done) {
          setIsLoading(false);
          setProgress(0);
          break;
        }
        const totalBytes = extractTotalBytes(decodedChunk);
        if (totalBytes) {
          totalLength = totalBytes;
          continue;
        }
        const downloadedBytes = extractDownloadedBytes(decodedChunk);
        if (downloadedBytes) {
          setProgress(Math.trunc((downloadedBytes / totalLength) * 100));
          continue;
        }
        if (value instanceof Uint8Array || (value as any) instanceof Array) {
          mergedBuffer = Buffer.concat([
            mergedBuffer,
            Buffer.from(value.buffer),
          ]);
        }
      }
      const blob = new Blob([mergedBuffer], { type: "application/zip" });

      // Create a temporary URL for the Blob
      const url = window.URL.createObjectURL(blob);

      // Create a link element to trigger the download
      const link = document.createElement("a");
      link.href = url;
      link.download = `${playListName}.zip`;

      // Programmatically click the link to start the download
      document.body.appendChild(link);
      link.click();

      // Cleanup: remove the link and revoke the URL
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setProgress(0);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <Button
        style={{
          backgroundImage: `linear-gradient(to right,hsl(var(--main-green)) ${progress}%, white ${progress}%)`,
        }}
        className="text-main-green text-center font-semibold"
        size={"lg"}
        onClick={async () => {
          setIsLoading(true);
          await (playListName ? downloadPlaylist() : downloadSingleAudio());
          setIsLoading(false);
        }}>
        {progress ? (
          <div className="text-black">{progress}%</div>
        ) : isLoading ? (
          <span className="loader border-green-main" />
        ) : (
          text || "Download"
        )}
      </Button>
    </div>
  );
}
