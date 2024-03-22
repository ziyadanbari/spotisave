import { useState } from "react";
import { Button } from "./ui/button";

export default function DownloadButton({
  playListName,
  name,
  text,
}: {
  playListName?: string;
  name: string[] | string;
  text?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<number | null>(0);
  const downloadSingleAudio = async () => {
    const response = await fetch(
      `https://spotisave-ao5b.vercel.app/getMusic?name=${name}`,
      {
        method: "get",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      }
    );
    if (!response.ok || !response.body) {
      throw response.statusText;
    }

    // Here we start prepping for the streaming response
    const reader = response.body.getReader();
    const chunks = [];
    let totalLength = 0;
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { value, done } = await reader.read();
      console.log(value, done);
      if (done) {
        setIsLoading(false);
        break;
      }
      const progressRegex = /progress: (\d+\.\d+)/gi;
      const decodedChunk = decoder.decode(value, { stream: true });
      if (progressRegex.test(decodedChunk)) {
        const match = decodedChunk.match(progressRegex);
        if (!match) continue;
        const progress = Number((match.slice(-1)[0].match(/\d+/) || [])[0]);
        if (!progress || typeof progress !== "number") continue;
        setProgress(progress);
      } else {
        chunks.push(value);
        totalLength += value.length;
      }
    }

    const mergedBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      mergedBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    const blob = new Blob([mergedBuffer], {
      type: 'audio/webm; codecs="opus"',
    });

    // Create a temporary URL for the Blob
    const url = window.URL.createObjectURL(blob);

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
  const downloadPlaylist = async () => {
    try {
      const response = await fetch(
        "https://spotisave-ao5b.vercel.app/downloadPlaylist",
        {
          method: "post",
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ names: name }),
        }
      );
      if (!response.ok || !response.body) {
        throw response.statusText;
      }

      // Here we start prepping for the streaming response
      const reader = response.body.getReader();
      const chunks = [];
      let totalLength = 0;
      const decoder = new TextDecoder("utf-8");
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          setIsLoading(false);
          break;
        }
        const progressRegex = /progress: (\d+\.\d+)/gi;
        const decodedChunk = decoder.decode(value, { stream: true });
        if (progressRegex.test(decodedChunk)) {
          const match = decodedChunk.match(progressRegex);
          if (!match) continue;
          const progress = Number((match.slice(-1)[0].match(/\d+/) || [])[0]);
          if (!progress || typeof progress !== "number") continue;
          setProgress(progress);
        } else {
          chunks.push(value);
          totalLength += value.length;
        }
      }

      const mergedBuffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        mergedBuffer.set(chunk, offset);
        offset += chunk.length;
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
    } catch (error) {}
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
