import React from "react";
import DownloadButton from "./DownloadButton";

export default function MusicPaper({
  avatar,
  name,
  artistName,
  id,
  index,
}: {
  avatar?: string;
  name: string;
  artistName: string;
  id: string;
  index: number;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="text-lg font-semibold">{index}</div>
      <div className="flex items-center justify-between gap-2 flex-1">
        <div className="flex gap-2 flex-1">
          <div className="w-14 h-14">
            <img src={avatar} className="w-full h-full" />
          </div>
          <div className=" flex flex-col justify-between">
            <div className="text-main-green font-medium max-w-52 overflow-hidden text-ellipsis whitespace-nowrap">
              {name}
            </div>
            <div className="text-sm whitespace-nowrap max-w-44 overflow-hidden text-ellipsis">
              {artistName}
            </div>
          </div>
        </div>
        <div>
          <DownloadButton name={`${artistName} ${name}`} />
        </div>
      </div>
    </div>
  );
}
