import { Firestore, FieldValue } from "@google-cloud/firestore";
import { getDefaultUserInfo } from "./defaults";

import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { Auth, https } from "gcip-cloud-functions";

const firestore = new Firestore();
const authClient = new Auth();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URL = process.env.GOOGLE_REDIRECT_URL;

export const beforesignin = authClient
  .functions()
  .beforeSignInHandler(async (user, event) => {
    if (
      !event.credential ||
      event.credential.providerId != "google.com" ||
      !user ||
      !event.credential.accessToken ||
      !event.credential.refreshToken
    ) {
      throw new https.HttpsError(
        "unauthenticated",
        "api.auth.invalid-credentials"
      );
    }

    const accessToken = event.credential.accessToken;
    const refreshToken = event.credential.refreshToken;

    // get channel info
    const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

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
      throw new https.HttpsError(
        "permission-denied",
        "api.auth.invalid-scopes-provided"
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
      throw new https.HttpsError(
        "not-found",
        "api.auth.youtube-channel-not-found"
      );
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
              (channel: any) => channel.channelId === channelInfo.channelId
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
        (channel: any) => channel.channelId != channelInfo.channelId
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
    return {};
  });
