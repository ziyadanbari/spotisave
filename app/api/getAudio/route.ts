import ytsr, { Item, Video } from "ytsr";
import { getVideoMP3Base64 } from "yt-get";
import NodeCache from "node-cache";
import archiver from "archiver";

const AudioCache = new NodeCache({ stdTTL: 1 * 3600, maxKeys: 20 });

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
        const base64Cache = AudioCache.get(name) as string;
        if (base64Cache)
          return files.push({
            name,
            buffer: await base64ToBuffer(base64Cache),
          });
        const results = (await ytsr(name, { limit: 1, safeSearch: true })) as {
          items: Video[];
        };
        const youtubeUrl = results.items[0]?.url;
        const { base64 } = await getVideoMP3Base64(youtubeUrl as string);
        try {
          AudioCache.set(name, base64);
        } catch (error) {}
        files.push({ name, buffer: await base64ToBuffer(base64) });
      })
    );
    const zipBuffer = await convertAndZip(files);
    const base64_archive = zipBuffer.toString("base64");
    return Response.json({ base64_archive });
  } else {
    const storedBase64 = AudioCache.get(name as string);
    if (storedBase64) return Response.json({ base64: storedBase64 });
    console.log(1);
    const results = (await ytsr(name as string, {
      limit: 1,
      safeSearch: true,
    })) as {
      items: Video[];
    };
    console.log(results);
    const youtubeUrl = results.items[0]?.url;
    const { base64 } = await getVideoMP3Base64(youtubeUrl as string);
    try {
      AudioCache.set(name as string, base64);
    } catch (error) {}
    return Response.json({ base64 });
  }
}
