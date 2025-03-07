/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { beforeUserCreated, HttpsError } from "firebase-functions/v2/identity";
import { Firestore } from "@google-cloud/firestore";
import { getDefaultUserInfo } from "./defaults";

import { OAuth2Client } from "google-auth-library";
import { defineString } from "firebase-functions/params";
import { google } from "googleapis";

const firestore = new Firestore();

const CLIENT_ID = defineString("GOOGLE_CLIENT_ID");
const CLIENT_SECRET = defineString("GOOGLE_CLIENT_SECRET");
const REDIRECT_URL = defineString("GOOGLE_REDIRECT_URL");

export const beforecreated = beforeUserCreated(
  {
    region: "us-west1",
    refreshToken: true,
    accessToken: true,
    idToken: true,
  },
  async (event) => {
    console.log(event);
    const user = event.data;
    if (
      !event.credential ||
      event.credential.providerId != "google.com" ||
      !user
    ) {
      throw new HttpsError("unauthenticated", "Invalid credentials");
    }

    const accessToken = event.credential.accessToken;
    const refreshToken = event.credential.refreshToken;

    // get channel info
    const client = new OAuth2Client(
      CLIENT_ID.value(),
      CLIENT_SECRET.value(),
      REDIRECT_URL.value(),
    );

    client.setCredentials({
      refresh_token: refreshToken,
      access_token: accessToken,
      scope:
        "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
    });
    // TODO: verify scopes
    // const info = await client.getTokenInfo(accessToken!);
    // info.scopes

    const youtube = google.youtube("v3");
    const response = await youtube.channels.list({
      auth: client,
      part: ["snippet"],
      mine: true,
      maxResults: 1,
    });
    const channels = response.data.items;
    if (!channels) {
      throw new HttpsError("not-found", "YouTube channel not found");
    }
    const channel = channels[0];
    const channelInfo = {
      channelId: channel.id!,
      picture: channel.snippet?.thumbnails?.default?.url,
      name: channel.snippet?.title,
      primary: true,
    };
    const userInfo = getDefaultUserInfo();
    userInfo.channels = [channelInfo] as never[];

    await firestore.runTransaction(async (tx) => {
      tx.set(firestore.collection("users").doc(user.uid), userInfo);
      tx.set(
        firestore
          .collection("yt_channel_credentials")
          .doc(channelInfo.channelId),
        {
          userId: user.uid,
          token: {
            AccessToken: accessToken,
            RefreshToken: refreshToken,
          },
        },
      );
    });
  },
);
