import UploadForm from "../components/UploadForm";

import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'; // TODO: switch to dndkit?
import { Anchor, Button, Center, Grid, Progress, RingProgress, ScrollArea, Space, Stack, Text, UnstyledButton } from '@mantine/core';
import { Dropzone, type FileWithPath } from '@mantine/dropzone';
import { useListState } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import cx from 'clsx';
import { doc, getDoc, getFirestore, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { BsX } from "react-icons/bs";
import { LuAudioLines } from "react-icons/lu";
import { useAuth } from "../components/Auth";
import { ChannelSelector } from "../components/YoutubeChannelSelector";
import { UserSettings } from "../types/auth";
import type { BaseMessage, ErrorMessage, RenderProgressMessage, RenderSuccessMessage } from "../types/messages";
import type { UploadItem, UploadRequest, UploadSession } from "../types/upload";
import { apiPost, downloadFile } from "../util/api";
import { formatBytes, formatDuration } from "../util/format";
import { displayError, displaySuccess } from "../util/log";
import { validateItem, validateSession } from "../util/validate";
import classes from './Upload.module.css';
import { Trans, useTranslation } from "react-i18next";
import QuotaMeter from "../components/QuotaMeter";
import config from "../config";

export default function Upload() {
    const { user, userInfo, refreshUserInfo } = useAuth();
    const [sessionLoadProgress, setSessionLoadProgress] = useState(0);
    const [isVideoUploading, setVideoUploading] = useState(false);
    const [uploadQueue, queueHandlers] = useListState<UploadItem>([]);
    const [selectedIndex, setSelectedIndex] = useState<null | number>(null);
    const [selectedChannelId, setSelectedChannelId] = useState<string>(userInfo!.settings.defaultChannelId);
    const [uploadProgress, setUploadProgress] = useState(100);
    const [videoUploadProgress, setVideoUploadProgress] = useState(0);
    const [uploadingStatus, setUploadingStatus] = useState("");
    const lastMessageTimestamp = useRef(0);
    const currentVideoUpload = useRef(1);
    const totalVideoUpload = useRef(1);
    const uploadedIds = useRef(new Set());
    const { t } = useTranslation();

    async function loadSession(userId: string) {
        setSessionLoadProgress(0);
        try {
            const snapshot = await getDoc(doc(getFirestore(), "sessions", userId));
            const session = snapshot.data() as UploadSession | undefined;
            if (session) {
                const err = validateSession(session);
                if (err) {
                    throw new Error(err);
                }
                // restore session
                const sessionWithBlobs: UploadItem[] = [];
                for (const [i, item] of session.items.entries()) {
                    const imageBlob = await downloadFile(item.imageFile, (prog) => setSessionLoadProgress((i + prog / 100) / session.items.length * 100));
                    sessionWithBlobs.push({
                        ...item,
                        imageFileBlob: imageBlob,
                    });
                }
                queueHandlers.setState(sessionWithBlobs);
            }
        } catch (err) {
            console.error(`Error loading session: ${err}`);
            saveSession(true);
        } finally {
            setSessionLoadProgress(100);
        }
    }

    async function saveSession(force: boolean = false) {
        if (!force && (sessionLoadProgress < 100)) {
            return;
        }
        const session: UploadSession = {
            items: uploadQueue.map((item) => {
                const { imageFileBlob, ...rest } = item;
                return rest;
            })
        };
        await setDoc(doc(getFirestore(), "sessions", user!.uid), session);
    }

    async function deleteItemObjects(item: UploadItem) {
        const { ref, getStorage, deleteObject } = await import("firebase/storage");
        const storage = getStorage();
        const refs = [];
        if (item.audioFile.startsWith("private")) {
            refs.push(ref(storage, item.audioFile));
        }
        if (item.imageFile.startsWith("private")) {
            refs.push(ref(storage, item.imageFile));
        }
        for (const ref of refs) {
            deleteObject(ref);
        }
    }

    async function removeItem(itemId: string) {
        // TODO: animation
        const i = uploadQueue.findIndex((item) => item.id === itemId);
        if (i === -1) {
            return;
        }
        queueHandlers.remove(i);
        deleteItemObjects(uploadQueue[i]);
    }

    useEffect(() => {
        saveSession();
        if (selectedIndex !== null && selectedIndex >= uploadQueue.length) {
            setSelectedIndex(null);
        }
        if (uploadQueue.length === 0) {
            setVideoUploading(false);
        }
    }, [uploadQueue]);

    useEffect(() => {
        if (user) {
            loadSession(user.uid);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            // handle progress messages
            const unsub = onSnapshot(doc(getFirestore(), "task_messages", user.uid), async (doc) => {
                const message = doc.data() as BaseMessage | undefined;
                if (!message || message.timestamp < (Date.now() - 10 * 1000)) { // 10 second timeout
                    return;
                }
                if (message.timestamp <= lastMessageTimestamp.current) {
                    return;
                }
                lastMessageTimestamp.current = message.timestamp;
                switch (message.type) {
                    case "error":
                        const errorMsg = message as ErrorMessage;
                        console.error(errorMsg.message);
                        displayError(t(errorMsg.message.i18nKey, errorMsg.message.data) as string);
                        if (errorMsg.reloadUsers) {
                            await refreshUserInfo();
                        }
                        setVideoUploading(false);
                        break;
                    case "progress":
                        const progressMsg = message as RenderProgressMessage;
                        if (!uploadedIds.current.has(progressMsg.itemId)) {
                            setVideoUploadProgress(progressMsg.percent);
                        }
                        break;
                    case "success":
                        const successMsg = message as RenderSuccessMessage;
                        displaySuccess(<Text>
                            <Trans t={t} i18nKey="upload.success" values={{ duration: successMsg.elapsed }} components={[<Anchor href={successMsg.videoUrl} target="_blank" />]} />
                        </Text>);
                        const i = uploadQueue.findIndex((item) => item.id === successMsg.itemId);
                        if (i !== -1) {
                            refreshUserInfo();
                            uploadedIds.current.add(successMsg.itemId);
                            currentVideoUpload.current += 1;
                            queueHandlers.remove(i);
                        }
                        setUploadingStatus(t('upload.upload-status', { current: currentVideoUpload.current, total: totalVideoUpload.current }));
                        setVideoUploadProgress(0);
                        break;
                }
            }, (err) => {
                console.error(err);
                displayError(err.message);
            });
            return unsub;
        }
    }, [user, uploadQueue]);

    async function uploadVideos() {
        setUploadingStatus(t('upload.upload-status-sending'));
        const request: UploadRequest = { channelId: selectedChannelId, videos: uploadQueue.map(({ imageFileBlob, ...rest }) => rest) }
        const response = await apiPost("/upload", request);
        if (response !== undefined) {
            const { uploading } = response as { uploading: number };
            if (uploading < uploadQueue.length) {
                notifications.show({
                    title: 'Warning',
                    message: t("upload.warning.quota-hit", { uploading, total: uploadQueue.length }),
                    color: "orange",
                })
            }
            totalVideoUpload.current = uploading;
            setUploadingStatus(t('upload.upload-status', { current: currentVideoUpload.current, total: totalVideoUpload.current }));
            if (uploading === 0) {
                setVideoUploading(false);
            }
        } else {
            setVideoUploading(false);
        }
    }

    function beginUpload() {
        for (const [i, item] of uploadQueue.entries()) {
            const reason = validateItem(item, false);
            if (reason !== null) {
                displayError(t("validate.item-error", { i: i + 1, reason }));
                return;
            }
        }
        currentVideoUpload.current = 1;
        uploadedIds.current = new Set();
        setVideoUploading(true);
        setUploadingStatus(t('upload.upload-status-initializing'));
        setVideoUploadProgress(0);
        uploadVideos();
    }

    async function onFilesDropped(files: FileWithPath[]) {
        setUploadProgress(0);
        for (const [i, file] of files.entries()) {

            function onProg(percent: number) {
                setUploadProgress(i / files.length * 100 + percent / files.length);
            }

            const { getUploadItemFromFile } = await import("../util/metadata");
            // calculate max upload item size to stay in quota
            const quota = config.const.UPLOAD_QUOTA_BYTES[userInfo!.subscription];
            const queueSize = uploadQueue.map((item) => item.audioFileSize + item.imageFileSize).reduce((t, a) => t + a, 0);
            const uploadItem = await getUploadItemFromFile(userInfo!, file, onProg, Math.max(0, quota - queueSize));
            if (uploadItem) {
                queueHandlers.append(uploadItem);
            }
            setUploadProgress((i + 1) / files.length * 100);
        }
        setUploadProgress(100);
    }

    async function formCallback(item: UserSettings) {
        if (selectedIndex !== null) {
            queueHandlers.setItem(selectedIndex, item.defaults);
        }
    }

    const items = uploadQueue.map((item, index) => (
        <Draggable key={item.id} index={index} draggableId={item.id}>
            {(provided, snapshot) => (
                <div
                    className={cx(classes.item, { [classes.itemDragging]: snapshot.isDragging }, { [classes.itemSelected]: index === selectedIndex })}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    ref={provided.innerRef}
                    onClick={() => setSelectedIndex(index)}
                >
                    <Stack gap="0" w="100%">
                        <span style={{ display: "inline-flex" }}><Text span truncate="end">{item.metadata.title}</Text></span>
                        <Text c="dimmed" size="sm">
                            <span style={{ maxWidth: "200px", display: "inline-flex" }}><Text span truncate="end">{item.originalAudioFileName}</Text></span> | {formatDuration(item.audioFileLength)} | {formatBytes(item.audioFileSize)}
                        </Text>
                    </Stack>
                    <UnstyledButton style={{ position: "absolute", top: 0, left: 0 }} onClick={() => removeItem(item.id)}>
                        <BsX size="1.5rem" color="gray"></BsX>
                    </UnstyledButton>
                </div>
            )}
        </Draggable>
    ));

    return (
        <Grid>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <Stack gap="0">
                    <ChannelSelector onChange={setSelectedChannelId} value={selectedChannelId}></ChannelSelector>
                    <QuotaMeter />
                    {!isVideoUploading && <Button fullWidth my={"sm"} onClick={beginUpload} disabled={uploadQueue.length === 0 || selectedChannelId === "" || sessionLoadProgress < 100}>{t('upload.button.upload-to-youtube')}</Button>}
                    {isVideoUploading && <Stack mt="sm" gap="0"><Progress animated value={videoUploadProgress} size="lg" transitionDuration={200} /><Text c="dimmed" ta="center" size="sm">{uploadingStatus}</Text></Stack>}
                    {sessionLoadProgress < 100 && <>
                        <Center><RingProgress transitionDuration={200} label={<Text ta="center">{`${sessionLoadProgress.toFixed(1)}%`}</Text>} sections={[{ value: sessionLoadProgress, color: 'blue' }]}></RingProgress></Center>
                        <Center><Text c="dimmed" size="sm">{t('upload.loading-session')}</Text></Center>
                    </>}
                    {sessionLoadProgress === 100 &&
                        <>
                            <DragDropContext
                                onDragEnd={({ destination, source }) =>
                                    queueHandlers.reorder({ from: source.index, to: destination?.index || 0 })
                                }
                            >
                                <ScrollArea.Autosize w="100%" maw="100%" mah="50vh" type="auto" scrollbars="y">
                                    <Droppable droppableId="dnd-list" direction="vertical">
                                        {(provided) => (
                                            <div style={(isVideoUploading) ? { "pointerEvents": "none" } : {}} {...provided.droppableProps} ref={provided.innerRef}>
                                                {items}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </ScrollArea.Autosize>
                            </DragDropContext>
                            {uploadProgress === 100 && <Dropzone
                                accept={{
                                    'audio/*': [],
                                }}
                                onDrop={onFilesDropped}
                                disabled={isVideoUploading}
                            >
                                <Center>
                                    <LuAudioLines></LuAudioLines>
                                    <Space w="sm" />
                                    <Text>{t('upload.dropzone')}</Text>
                                </Center>
                            </Dropzone>}
                            {uploadProgress < 100 && <Progress animated value={uploadProgress} size="lg" transitionDuration={200} />}
                        </>}
                </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 8 }}>
                {selectedIndex !== null && selectedIndex < uploadQueue.length && <UploadForm settingsMode="regular" disabled={isVideoUploading} initialItemData={{ ...userInfo!.settings, defaults: uploadQueue[selectedIndex] }} formCallback={formCallback}>
                </UploadForm>}
                {selectedIndex === null && <Text ta="center">{t('upload.no-track-selected')}</Text>}
            </Grid.Col>
        </Grid >
    );
}