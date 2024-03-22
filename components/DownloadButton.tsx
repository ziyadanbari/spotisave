import React, { useState } from "react";
import { Button } from "./ui/button";
import axios from "axios";
import { base64toBlob } from "@/exports";

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
  const downloadSingleAudio = async () => {
    try {
      const response = await axios.post<any, any, { name: string | string[] }>(
        "/api/getAudio",
        {
          name,
        }
      );
      const blob = base64toBlob(response.data.base64);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.log(error);
    }
  };
  const downloadArchiveAudio = async () => {
    try {
      const response = await axios.post<any, any, { name: string | string[] }>(
        "/api/getAudio",
        {
          name,
        }
      );
      const blob = base64toBlob(
        response.data.base64_archive,
        "application/zip"
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${playListName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.log(error);
    }
  };
  return (
    <div>
      <Button
        className="text-main-green text-center font-semibold"
        size={"lg"}
        onClick={async () => {
          try {
            setIsLoading(true);
            await (playListName
              ? downloadArchiveAudio()
              : downloadSingleAudio());
          } catch (error) {
          } finally {
            setIsLoading(false);
          }
        }}>
        {isLoading ? (
          <span className="loader border-green-main" />
        ) : (
          text || "Download"
        )}
      </Button>
    </div>
  );
}
