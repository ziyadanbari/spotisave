export default {
  youtubeDLConfig: {
    quality: 'highestaudio',
  },
  flags: {
    cacheFile: '.spdlcache',
    cookieFile: 'cookies.txt',
    downloadReport: true,
    output: process.cwd(),
    extraSearch: '',
    login: false,
    password: '',
    username: '',
    savedAlbums: false,
    savedPlaylists: false,
    savedTracks: false,
    savedShows: false,
    outputOnly: false,
    downloadLyrics: false,
    searchFormat: '',
    exclusionFilters: '',
  },
  spotifyApi: {
    clientId: 'e77fa00b3d2440e89d66fc7f40369cf5',
    clientSecret: 'f27ea124f4254cbfa71e1adef21cd051',
  },
  isTTY: process.stdout.isTTY,
};
