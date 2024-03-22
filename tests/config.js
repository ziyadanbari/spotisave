/**
 * @param {string} spotifyClientId - The client id of the spotify app
 * @param {string} spotifyAccessToken - The access token of the user whose playlist you are trying to access.
 * @param {string} spotifyPlaylistId - The playlist id
 * @param {string} additionalSearchTerm - Any additionalSearchTerms you want to add to the search on yt.
 *@param {string} folderNam - The folder to which songs will be downloaded (can include navigation  )
 */
const config = {
  spotifyClientId: "1d6fb9bb592b41d2a9f9e5316f1464c1",
  spotifyClientSecret: "6e50fa0d7d654b92ab662e4b432342f6",
  spotifyPlaylistId: "6fvCbWrc99HiNG0oNjIgqv",
  additionalSearchTerm: "",
  folderName: "./music",
};
module.exports = config;
