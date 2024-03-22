import Youtube from "youtube-sr";
import { getVideoMP3Base64 } from "yt-get";
import archiver from "archiver";

async function base64ToBuffer(base64Data: string): Promise<Buffer> {
  return Buffer.from(base64Data, "base64");
}

async function convertBase64ArrayToBuffers(
  base64Array: string[]
): Promise<Buffer[]> {
  const buffers: Buffer[] = [];

  for (let i = 0; i < base64Array.length; i++) {
    buffers.push(await base64ToBuffer(base64Array[i]));
  }

  return buffers;
}

async function zipMP3Buffers(
  mp3Buffers: { name: string; buffer: Buffer }[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    const buffers: Buffer[] = [];
    archive.on("data", (buffer: Buffer) => buffers.push(buffer));
    archive.on("error", (error: any) => reject(error));
    archive.on("end", () => resolve(Buffer.concat(buffers)));

    mp3Buffers.forEach(({ buffer, name }) => {
      archive.append(buffer, { name: `${name}.mp3` });
    });

    archive.finalize();
  });
}

async function convertAndZip(
  files: { name: string; buffer: Buffer }[]
): Promise<Buffer> {
  const zipBuffer = await zipMP3Buffers(
    files.map(({ buffer, name }) => ({ buffer, name }))
  );
  return zipBuffer;
}

export async function POST(req: Request) {
  const { name }: { name: string | string[] } = await req.json(); // Assuming name is sent in the request body
  if (Array.isArray(name)) {
    const files: { name: string; buffer: Buffer }[] = [];
    await Promise.all(
      name.map(async (name: string) => {
        const results = await Youtube.searchOne(name);
        const youtubeUrl = results.url;
        const { base64 } = await getVideoMP3Base64(youtubeUrl as string);
        files.push({ name, buffer: await base64ToBuffer(base64) });
      })
    );
    const zipBuffer = await convertAndZip(files);
    const base64_archive = zipBuffer.toString("base64");
    return Response.json({ base64_archive });
  } else {
    const results = await Youtube.searchOne(name);
    const youtubeUrl = results.url;
    console.log(youtubeUrl);
    const { base64 } = await getVideoMP3Base64(youtubeUrl as string);
    return Response.json({ base64 });
  }
}
