import nodeID3 from "node-id3";
import fs, { writeFileSync } from "fs";
import sharp from "sharp";
async function addThumbnailToAudio(audioFile, imageFile, outputFile) {
  try {
    // Read audio file
    const audioData = fs.readFileSync(audioFile);

    // Read image file
    const imageBuffer = await sharp(imageFile)
      .toFormat("jpeg")
      .resize(640, 640) // Adjust size as needed
      .toBuffer();

    // Set image as thumbnail
    const tags = {
      image: {
        mime: "image/jpeg",
        type: { id: 3 },
        imageBuffer: imageBuffer,
      },
      title: "Test",
      album: "Test",
    };
    console.log(imageBuffer);
    console.log(nodeID3.read(audioFile).image);
    // Write the tags to the audio file
    const success = nodeID3.write(tags, audioData, (err, buffer) => {
      writeFileSync(outputFile, buffer);
    });

    if (success) {
      console.log("Thumbnail added successfully.");
    } else {
      console.error("Failed to add thumbnail.");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Example usage:
const audioFile = "./audios/Drake Toosie Slide.mp3";
const imageFile = "./ab67616d0000b273bba7cfaf7c59ff0898acba1f.jpeg";
const outputFile = "output_with_thumbnail.mp3";

addThumbnailToAudio(audioFile, imageFile, outputFile);
