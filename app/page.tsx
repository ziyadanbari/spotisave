"use client";
import { Button, Input, Navbar } from "@/exports";
import type { FormValues, SpotifySearchResult, Track } from "@/types";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useState } from "react";
import SpotifyShow from "@/components/SpotifyShow";
export default function Home() {
  const [loading, setLoading] = useState<boolean>(false);
  const { register, handleSubmit, watch } = useForm<FormValues>();
  const [results, setResults] = useState<SpotifySearchResult | null>(null);
  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      const response = await axios.post<any, any, FormValues>(
        "/api/getSpotifyLink",
        values
      );
      const data = response.data;
      const metaData: SpotifySearchResult = {
        id: data.id,
        avatar:
          data.type === "track" ? data.album.images[0].url : data.images[0].url,
        name: data.name,
        ownerName:
          data.type === "track"
            ? data.artists.map(({ name }: { name: string }) => name).join(",")
            : data.owner.display_name,
        tracks:
          data.type === "track"
            ? [
                {
                  avatar: data.album.images[0].url,
                  id: data.id,
                  artistName: data.artists
                    .map(({ name }: { name: string }) => name)
                    .join(","),
                  musicName: data.name,
                },
              ]
            : data.tracks.items.map((item: any) => {
                const track = item.track;
                const data: Track = {
                  id: track.id,
                  artistName: track.artists
                    .map(({ name }: { name: string }) => name)
                    .join(","),
                  avatar: track.album.images[0].url,
                  musicName: track.name,
                };
                return data;
              }),
      };
      setResults(metaData);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="w-full h-full">
      <div className="flex flex-col gap-8">
        <div>
          <Navbar />
        </div>
        <div className="flex-1 w-full flex justify-center  items-center sm:px-10 px-3">
          <div className="xl:w-2/4 md:w-2/3 w-full my-10">
            <div className="w-full flex flex-col gap-8 items-center">
              <div className=" text-5xl font-bold tracking-wide text-center">
                Spotify Downloader
              </div>
              <form
                className="w-full flex flex-col gap-4"
                onSubmit={handleSubmit(onSubmit)}>
                <div>
                  <Input
                    {...register("link")}
                    className="px-4 py-6 w-full bg-gray-800"
                    placeholder="Spotify link ex: https://open.spotify.com/.../..."
                  />
                </div>
                <div>
                  <Button
                    disabled={!Boolean(watch("link")?.length)}
                    className="w-full bg-main-green/80 hover:bg-main-green/60 text-center  text-white text-lg font-semibold"
                    size="lg">
                    Download
                  </Button>
                </div>
              </form>
              <div className="w-full">
                {results ? (
                  <SpotifyShow results={results} />
                ) : loading ? (
                  <div className="flex justify-center">
                    <span className="loader w-14 h-14 border-4 "></span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
