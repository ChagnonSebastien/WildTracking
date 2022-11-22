import * as functions from "firebase-functions";
import {Client} from "@googlemaps/google-maps-services-js";
import parseImageMetadata from "./parseImageMetadata";
import retrievePositionData from "./retrievePositionData";

import * as admin from "firebase-admin";
admin.initializeApp();


const client = new Client({});
const StorageInstance = admin.storage();
const FirestoreInstance = admin.firestore();
FirestoreInstance.settings({ignoreUndefinedProperties: true});


export const fetchLocations = functions
  .pubsub
  .schedule("*/10 * * * *")
  .timeZone("America/Montreal")
  .onRun(() => retrievePositionData(client, FirestoreInstance));

export const parseMetadata = functions
  .runWith({ memory: "1GB" })
  .storage
  .bucket()
  .object()
  .onFinalize((metadata) => parseImageMetadata(metadata, FirestoreInstance, StorageInstance, client));
