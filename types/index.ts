export interface FormValues {
  link: string;
}

export interface SpotifySearchResult {
  name: string;
  avatar?: string;
  id: string;
  ownerName: string;
  tracks: Track[];
}

export interface Track {
  id: string;
  artistName: string;
  avatar?: string;
  musicName: string;
}
