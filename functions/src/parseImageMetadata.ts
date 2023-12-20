import { Client, TimeZoneResponse } from "@googlemaps/google-maps-services-js";
import axios from "axios";
import { firestore, storage } from "firebase-admin";
import { config, storage as storageFunctions } from "firebase-functions";


const retrievePositionData = async (
  object: storageFunctions.ObjectMetadata,
  FirestoreInstance: firestore.Firestore,
  StorageInstance: storage.Storage,
  client: Client,
) => {
  if (typeof object.mediaLink === "undefined" || typeof object.name === "undefined") return;
  const filePath = object.name.split("/");
  if (filePath.length !== 2 || filePath[0] !== "pictures") return;
  const fileName = filePath[filePath.length - 1];
  const fileNameNoExt = fileName.slice(0, fileName.lastIndexOf("."))
  console.log("New image:", fileNameNoExt);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const exifParser = require("exif-parser");

  const response = await axios.get(object.mediaLink, {responseType: "arraybuffer"});
  const tags = exifParser.create(response.data).parse().tags;
  const lat = tags.GPSLatitude;
  const lng = tags.GPSLongitude;
  const time = tags.DateTimeOriginal;

  if (typeof lat === "undefined" || typeof lng === "undefined" || typeof time === "undefined") {
    console.error("Missing EXIF tags", { lat, lng, time });
    return;
  }

  const timestamp = new firestore.Timestamp(time, 0);

  console.log("Creating Thumbnail from full image");
  const Jimp = require("jimp");
  let medBuff = await require('sharp')(new Buffer(response.data))
    .resize({ width: 256, height: 256, fit: 'inside' })
    .toBuffer();

  console.log(`Saving the smaller to /gallery/${fileNameNoExt}.jpg`)
  await StorageInstance.bucket().file(`gallery/${fileNameNoExt}.jpg`).save(medBuff);


  medBuff = await require('sharp')(new Buffer(response.data))
    .resize({ width: 64, height: 64, fit: 'cover' })
    .png({
      force: true,
      palette: true,
      effort: 5,
    })
    .ensureAlpha()
    .extend({ right: 64, background: { alpha: 0, r: 0, g: 0, b: 0 } })
    .toBuffer();
  let image = await Jimp.read(medBuff);
  for (const { x, y, idx } of image.scanIterator(0, 0, image.bitmap.width / 2, image.bitmap.height)) {
    const distanceFromEdgeX = x < image.bitmap.width / 4 ? x : image.bitmap.width / 2 - x - 1;
    const adjustedHeight = image.bitmap.height;// - 3;
    const distanceFromEdgeY = y < adjustedHeight / 2 ? y : adjustedHeight - y - 1;
    if (
      (distanceFromEdgeX) * (distanceFromEdgeY) <= 4
    ) {
      image.bitmap.data[idx] = 88;
      image.bitmap.data[idx + 1] = 94;
      image.bitmap.data[idx + 2] = 109;
      image.bitmap.data[idx + 3] = 255;
    }
    if (
      (distanceFromEdgeX + 1) * (distanceFromEdgeY + 1) <= 4
      && (x < image.bitmap.width / 4 || y < image.bitmap.height / 2)
      //&& !((y >= adjustedHeight) && ((image.bitmap.height - y - 1) >= Math.abs(x - (image.bitmap.width / 2))))
    ) {
      image.bitmap.data[idx + 3] = 0;
    }
  }
  const buffer = await image.quality(60).getBufferAsync("image/png");

  console.log(`Saving the thumbnail to /preview/${fileNameNoExt}.png`)
  await StorageInstance.bucket().file(`preview/${fileNameNoExt}.png`).save(buffer);

  console.log("Probing Timezone API");
  const timezoneResponse: TimeZoneResponse = await client.timezone({
    params: {
      location: {lat, lng},
      key: config().maps.key,
      timestamp: time,
    },
    timeout: 1000,
  });
  const {timeZoneId} = timezoneResponse.data;

  const imageDocumentData = {
    src: fileNameNoExt,
    pos: new firestore.GeoPoint(lat, lng),
    timestamp,
    timezoneId: timeZoneId,
  }

  console.log("Inserting new image in Firestore:", JSON.stringify(imageDocumentData));
  FirestoreInstance.collection("images").doc().create(imageDocumentData)
    .then(() => {
      console.log("Successfully inserted document.");
    })
    .catch((reason: unknown) => {
      console.error("Could not insert document", JSON.stringify(reason));
    });
};

export default retrievePositionData;
