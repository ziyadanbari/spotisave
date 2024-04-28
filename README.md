**README: Spotify Music Downloader using Spotify API, YouTube Data API, Next.js, and Express.js**

---

### Overview

This project offers a web-based solution for downloading music from Spotify using the Spotify API and then converting it to audio files using a third-party library called yt-core, which utilizes YouTube resources. The frontend is built with Next.js, a React framework, while the backend server is developed using Express.js.

### Requirements

- Node.js
- npm or yarn package manager
- Spotify Developer Account (for accessing the Spotify API)
- YouTube Data API key (for using yt-core)
- Dependencies specified in `package.json`

### Installation

1. Clone the repository to your local machine:

    ```
    git clone https://github.com/ziyadanbari/spotisave (frontend)
    git clone https://github.com/ziyadanbari/spotisave -b backend ./spotisave_backend (backend)
    ```

2. Navigate to the project directory:

    ```
    cd spotisave
    ```

3. Install the required dependencies for both frontend and backend:

    ```
    npm install
    cd ../spotisave_backend
    npm install
    ```

4. Obtain your Spotify API credentials (Client ID and Client Secret) by creating an application on the Spotify Developer Dashboard.

5. Obtain your YouTube Data API key from the Google Developer Console.

6. Update the `.env` file in the `spotisave` directory with your Spotify API credentials and YouTube Data API key.

### Usage

1. Start the backend server:

    ```
    cd backend
    npm start
    ```

2. Start the Next.js development server for the frontend:

    ```
    cd ../spotisave
    npm run dev
    ```

3. Access the application in your web browser at `http://localhost:3000`.

4. Follow the prompts on the web interface to authenticate with Spotify (if required) and specify the music you want to download.

5. Select the desired tracks, albums, or playlists from Spotify.

6. The frontend communicates with the backend Express.js server, which then uses yt-core to search for each selected item on YouTube and download the audio files.

7. Once the download process is complete, the audio files will be available for download or streaming through the web interface.

### Important Notes

- This project relies on the Spotify API and YouTube resources. Ensure that you comply with their respective terms of service and usage policies.
- Spotify API may have rate limits or restrictions on certain endpoints. Check the Spotify Developer documentation for more information.
- YouTube Data API also has usage limits and quota restrictions. Monitor your usage to avoid hitting quota limits.
- This project is for educational purposes only. Respect copyright laws and use it responsibly.

### Acknowledgments

- This project utilizes the Spotify API, Next.js, Express.js, and yt-core library.
- Special thanks to the developers and contributors of Spotify, Next.js, Express.js, and yt-core for providing the necessary tools and resources.
