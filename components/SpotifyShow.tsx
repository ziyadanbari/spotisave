import { SpotifySearchResult } from "@/types";
import React from "react";
import { Skeleton } from "./ui/skeleton";
import MusicPaper from "./MusicPaper";
import { Separator } from "./ui/separator";
import DownloadButton from "./DownloadButton";

export default function SpotifyShow({
  results,
  skeleton,
}: {
  results: SpotifySearchResult;
  skeleton?: boolean;
}) {
  return (
    <div>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2">
          <div className="w-64 h-64">
            {!skeleton ? (
              <img
                src={results.avatar}
                className="w-full h-full"
                alt="avatar"
              />
            ) : (
              <Skeleton className="w-full h-full rounded-none" />
            )}
          </div>
          <div className="text-main-green text-lg font-semibold">
            {results.name}
          </div>
          <div className="text-base font-medium">{results.ownerName}</div>
        </div>
        {results.tracks.length > 1 && (
          <div className="flex justify-center">
            <DownloadButton
              id={results.tracks.map((track) => track.id)}
              playListName={results.name}
              text="Download All"
              name={results.tracks.map(
                (track) => `${track.artistName} ${track.musicName}`
              )}
            />
          </div>
        )}
        <div>
          <Separator />
        </div>
        <div className=" flex flex-col gap-5">
          {results.tracks.map((track, i) => {
            return (
              <MusicPaper
                avatar={track.avatar || ""}
                id={track.id}
                artistName={track.artistName}
                index={i + 1}
                key={track.id}
                name={track.musicName}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
