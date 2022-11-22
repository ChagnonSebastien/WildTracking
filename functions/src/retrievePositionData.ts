import axios from "axios";
import {firestore} from "firebase-admin";
import { Client, ElevationResponse, TimeZoneResponse } from "@googlemaps/google-maps-services-js";
import {config} from "firebase-functions";

type SpotResponse = {
  response: {
    feedMessageResponse: {
      count: number,
      messages: {
        message: Array<{
          latitude: number,
          longitude: number,
          unixTime: number,
          messageType: string,
          messageContent: string,
          batteryState: string,
        }>,
      },
    },
    errors?: { error:{ code: string } },
  },
}

const retrievePositionData = async (client: Client, FirestoreInstance: firestore.Firestore) => {
  const feedID = config().feed.id;
  let offset = 0;

  outer:
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = `https://api.findmespot.com/spot-main-web/consumer/rest-api/2.0/public/feed/${feedID}/message.json?start=${offset}`;
    const response = await axios.get<SpotResponse>(url);
    console.log(`Probing findmespot API with offset ${offset}`);
    if (response.data.response.errors) {
      if (response.data.response.errors.error.code === "E-0195") {
        console.log("Reached end of feed.");
      } else {
        console.log("findmespot returned errors. Stopping.", JSON.stringify(response.data.response.errors));
      }
      break;
    }
    const messages = response.data.response.feedMessageResponse.messages.message;

    while (messages.length > 0) {
      const message = messages.shift();
      if (!message) throw new Error("No more items in the current queue.");

      console.log("Checking if point is already saved...");
      const query = await FirestoreInstance
        .collection("locationHistory")
        .where("timestamp", "==", firestore.Timestamp.fromMillis(message.unixTime * 1000))
        .limit(1)
        .get();
      if (!query.empty) {
        console.log("Found duplicate entry. Stopping.");
        break outer;
      } else {
        console.log("Found new point.");
      }

      console.log("Probing Elevation API");
      const elevationResponse: ElevationResponse = await client.elevation({
        params: {
          locations: [{lat: message.latitude, lng: message.longitude}],
          key: config().maps.key,
        },
        timeout: 1000,
      });

      console.log("Probing Timezone API");
      const timezoneResponse: TimeZoneResponse = await client.timezone({
        params: {
          location: {lat: message.latitude, lng: message.longitude},
          key: config().maps.key,
          timestamp: message.unixTime,
        },
        timeout: 1000,
      });
      const {timeZoneId, timeZoneName} = timezoneResponse.data;

      const formattedMessage = {
        timestamp: firestore.Timestamp.fromMillis(message.unixTime * 1000),
        location: new firestore.GeoPoint(message.latitude, message.longitude),
        messageType: message.messageType,
        messageContent: message.messageContent,
        batteryState: message.batteryState,
        elevation: elevationResponse.data.results[0].elevation,
        timezone: {id: timeZoneId, name: timeZoneName},
      };

      console.log("Inserting new point in Firestore:", JSON.stringify(formattedMessage));
      FirestoreInstance.collection("locationHistory").doc().create(formattedMessage)
        .then(() => {
          console.log("Successfully inserted document.");
        })
        .catch((reason: unknown) => {
          console.error("Could not insert document", JSON.stringify(reason));
        });
    }

    offset += response.data.response.feedMessageResponse.count;
  }
};

export default retrievePositionData;
