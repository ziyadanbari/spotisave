import axios from "axios";
import SpotifyWebApi from "spotify-web-api-node";
import NodeCache from "node-cache";
const spotifyApi = new SpotifyWebApi({
  clientId: "e77fa00b3d2440e89d66fc7f40369cf5",
  clientSecret: "f27ea124f4254cbfa71e1adef21cd051",
});

const SearchCache = new NodeCache({ stdTTL: 4 * 3600, maxKeys: 40 });

async function getToken() {
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: "e77fa00b3d2440e89d66fc7f40369cf5",
        client_secret: "f27ea124f4254cbfa71e1adef21cd051",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return response.data.access_token;
  } catch (error: any) {
    console.log(error?.response?.data);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { link: url }: { link: string } = await req.json();
    const data = SearchCache.get(url);
    if (data) {
      return Response.json(data);
    }
    const token = await getToken();
    if (!token) {
      throw new Error("failed to fetch access_token");
    }
    spotifyApi.setAccessToken(token);

    const trackId = extractTrackId(url);
    const playlistId = extractPlaylistId(url);
    if (!trackId && !playlistId) {
      return Response.json({ message: "Invalid URL!" });
    }
    if (trackId) {
      const track = await spotifyApi.getTrack(trackId);
      try {
        SearchCache.set(url, track.body);
      } catch (error) {}
      return Response.json(track.body);
    } else if (playlistId) {
      const playlist = await spotifyApi.getPlaylist(playlistId);
      try {
        SearchCache.set(url, playlist.body);
      } catch (error) {}
      return Response.json(playlist.body);
    }
  } catch (error) {
    POST(req);
  }
}

function extractTrackId(trackUrl: string): string | null {
  const trackId = trackUrl.match(/track\/([a-zA-Z0-9]{22})/);
  return trackId ? trackId[1] : null;
}

function extractPlaylistId(playlistLink: string): string | null {
  const regex = /playlist\/(\w+)/;
  const match = playlistLink.match(regex);
  if (match && match.length > 1) {
    return match[1];
  } else {
    return null;
  }
}
