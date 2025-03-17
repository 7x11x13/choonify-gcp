/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { HttpsError, beforeUserSignedIn } from "firebase-functions/v2/identity";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import { getDefaultUserInfo } from "./defaults";

import { OAuth2Client } from "google-auth-library";
import { defineString } from "firebase-functions/params";
import { google } from "googleapis";

const firestore = new Firestore();

const CLIENT_ID = defineString("GOOGLE_CLIENT_ID");
const CLIENT_SECRET = defineString("GOOGLE_CLIENT_SECRET");
const REDIRECT_URL = defineString("GOOGLE_REDIRECT_URL");

export const beforesignin = beforeUserSignedIn(
  {
    region: "us-west1",
    refreshToken: true,
    accessToken: true,
    idToken: true,
  },
  async (event) => {
    const user = event.data;
    if (
      !event.credential ||
      event.credential.providerId != "google.com" ||
      !user ||
      !event.credential.accessToken ||
      !event.credential.refreshToken
    ) {
      throw new HttpsError("unauthenticated", "api.auth.invalid-credentials");
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
    const info = await client.getTokenInfo(accessToken);
    if (
      !info.scopes.includes("https://www.googleapis.com/auth/youtube.upload") ||
      !info.scopes.includes("https://www.googleapis.com/auth/youtube.readonly")
    ) {
      throw new HttpsError(
        "permission-denied",
        "api.auth.invalid-scopes-provided",
      );
    }

    const youtube = google.youtube("v3");
    const response = await youtube.channels.list({
      auth: client,
      part: ["snippet"],
      mine: true,
      maxResults: 1,
    });
    const channels = response.data.items;
    if (!channels) {
      throw new HttpsError("not-found", "api.auth.youtube-channel-not-found");
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
      const userRef = firestore.collection("users").doc(user.uid);
      const credsRef = firestore
        .collection("yt_channel_credentials")
        .doc(channelInfo.channelId);
      const userDoc = await tx.get(userRef);
      const credsDoc = await tx.get(credsRef);
      if (credsDoc.exists) {
        const otherUserId = credsDoc.get("userId") as string;
        // if channel linked to another user already,
        // remove it from their linked channels
        if (otherUserId != user.uid) {
          const otherUserRef = firestore.collection("users").doc(otherUserId);
          const otherUserInfo = await tx.get(otherUserRef);
          const otherUserChannelInfo = otherUserInfo
            .get("channels")!
            .find(
              (channel: any) => channel.channelId === channelInfo.channelId,
            );
          tx.update(otherUserRef, {
            channels: FieldValue.arrayRemove(otherUserChannelInfo),
          });
          if (
            otherUserInfo.get("settings.defaultChannelId") ===
            channelInfo.channelId
          ) {
            tx.update(otherUserRef, {
              "settings.defaultChannelId": "",
            });
          }
        }
      }
      if (!userDoc.exists) {
        tx.set(firestore.collection("users").doc(user.uid), userInfo);
      }
      let oldChannels = [];
      if (userDoc.exists) {
        oldChannels = userDoc.get("channels");
      }
      const newChannels = oldChannels.filter(
        (channel: any) => channel.channelId != channelInfo.channelId,
      );
      newChannels.unshift(channelInfo);
      tx.update(userRef, {
        channels: newChannels,
      });
      tx.set(credsRef, {
        userId: user.uid,
        token: {
          AccessToken: accessToken,
          RefreshToken: refreshToken,
        },
      });
    });
  },
);
