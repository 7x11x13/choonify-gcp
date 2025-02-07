import UploadForm from "../components/UploadForm";

import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { Anchor, Button, Center, Grid, Progress, ScrollArea, Space, Stack, Text } from '@mantine/core';
import { Dropzone, type FileWithPath } from '@mantine/dropzone';
import { useListState } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import cx from 'clsx';
import { useEffect, useRef, useState } from "react";
import { LuAudioLines } from "react-icons/lu";
import { ChannelSelector } from "../components/YoutubeChannelSelector";
import type { UploadItem, UploadRequest } from "../types/upload";
import type { BaseMessage, ErrorMessage, RenderProgressMessage, RenderSuccessMessage } from "../types/messages";
import { apiPost } from "../util/aws";
import { formatBytes, formatDuration } from "../util/format";
import { getUploadItemFromFile } from "../util/metadata";
import { validateItem } from "../util/validate";
import classes from './Upload.module.css';
import { useAuth } from "../components/Auth";
import { doc, getFirestore, onSnapshot } from "firebase/firestore";

export default function Upload() {
    const { user, userInfo } = useAuth();
    const [isVideoUploading, setVideoUploading] = useState(false);
    const [uploadQueue, handlers] = useListState<UploadItem>([]);
    const [selectedIndex, setSelectedIndex] = useState<null | number>(null);
    const selectedChannelId = useRef<null | string>(null);
    const [refreshChannelState, refreshChannels] = useState({});
    const [uploadProgress, setUploadProgress] = useState(100);
    const [videoUploadProgress, setVideoUploadProgress] = useState(0);
    const [uploadingStatus, setUploadingStatus] = useState("");
    const currentVideoUpload = useRef(1);
    const totalVideoUpload = useRef(1);
    const uploadedIds = useRef(new Set());

    useEffect(() => {
        if (user) {
            onSnapshot(doc(getFirestore(), "task_messages", user?.uid), (doc) => {
                const message = doc.data() as BaseMessage | undefined;
                if (!message || message.timestamp < (Date.now() - 5 * 60 * 1000)) { // 5 minute timeout
                    return;
                }
                switch (message.type) {
                    case "error":
                        const errorMsg = message as ErrorMessage;
                        console.error(errorMsg.message);
                        notifications.show({
                            title: 'Error',
                            message: errorMsg.message,
                            color: "red",
                        });
                        if (errorMsg.reloadUsers) {
                            refreshChannels({});
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
                        notifications.show({
                            title: 'Success',
                            message: <Text><Anchor href={successMsg.videoUrl}>Upload</Anchor> took {successMsg.elapsed.toFixed(2)}s</Text>
                        });
                        const i = uploadQueue.findIndex((item) => item.id === successMsg.itemId);
                        if (i !== -1) {
                            uploadedIds.current.add(successMsg.itemId);
                            currentVideoUpload.current += 1;
                            uploadQueue.splice(i, 1);
                            handlers.remove(i);
                            if (selectedIndex !== null && selectedIndex >= uploadQueue.length) {
                                setSelectedIndex(null);
                            }
                            if (uploadQueue.length === 0) {
                                setVideoUploading(false);
                            }
                        }
                        setUploadingStatus(`Uploading video ${currentVideoUpload.current} of ${totalVideoUpload.current}`);
                        setVideoUploadProgress(0);
                        break;
                }
            }, (err) => {
                console.error(err);
                notifications.show({
                    title: 'Error',
                    message: err.message,
                    color: "red",
                });
            });
        }
    }, [user]);

    async function uploadVideos() {
        setUploadingStatus("Sending upload info...");
        const request: UploadRequest = { channelId: selectedChannelId.current!, videos: uploadQueue.map(({ imageFileBlob, ...rest }) => rest) }
        const response = await apiPost("/upload", request);
        if (response !== undefined) {
            const { uploading } = response as { uploading: number };
            if (uploading < uploadQueue.length) {
                notifications.show({
                    title: 'Warning',
                    message: `Upload quota hit! Only uploading ${uploading} of ${uploadQueue.length} videos. Upgrade your plan to increase the quota`,
                })
            }
            totalVideoUpload.current = uploading;
            setUploadingStatus(`Uploading video ${currentVideoUpload.current} of ${totalVideoUpload.current}`);
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
                notifications.show({
                    title: 'Error',
                    message: `Upload item ${i + 1} is invalid: ${reason}`,
                    color: "red",
                });
                return;
            }
        }
        currentVideoUpload.current = 1;
        uploadedIds.current = new Set();
        setVideoUploading(true);
        setUploadingStatus("Initializing...");
        setVideoUploadProgress(0);
        uploadVideos();
    }

    async function onFilesDropped(files: FileWithPath[]) {
        setUploadProgress(0);
        for (const [i, file] of files.entries()) {

            function onProg(percent: number) {
                setUploadProgress(i / files.length * 100 + percent / files.length);
            }

            const uploadItem = await getUploadItemFromFile(userInfo!, file, onProg);
            if (uploadItem) {
                handlers.append(uploadItem);
            }
            setUploadProgress((i + 1) / files.length * 100);
        }
        setUploadProgress(100);
    }

    async function formCallback(item: UploadItem) {
        if (selectedIndex !== null) {
            handlers.setItem(selectedIndex, item);
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
                </div>
            )}
        </Draggable>
    ));

    return (
        <Grid>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <Stack gap="0">
                    <ChannelSelector refreshState={refreshChannelState} selectedChannelId={selectedChannelId}></ChannelSelector>
                    {!isVideoUploading && <Button fullWidth my={"sm"} onClick={beginUpload} disabled={uploadQueue.length === 0 || selectedChannelId.current === null}>Upload to YouTube!</Button>}
                    {isVideoUploading && <Stack mt="sm" gap="0"><Progress value={videoUploadProgress} size="lg" transitionDuration={200} /><Text c="dimmed" ta="center" size="sm">{uploadingStatus}</Text></Stack>}
                    <ScrollArea.Autosize w="100%" maw="100%" mah="50vh" type="auto" scrollbars="y">
                        <DragDropContext
                            onDragEnd={({ destination, source }) =>
                                handlers.reorder({ from: source.index, to: destination?.index || 0 })
                            }
                        >
                            <Droppable droppableId="dnd-list" direction="vertical">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef}>
                                        {items}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </ScrollArea.Autosize>
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
                            <Text>Drag songs here or click to select files</Text>
                        </Center>
                    </Dropzone>}
                    {uploadProgress < 100 && <Progress value={uploadProgress} size="lg" transitionDuration={200} />}
                </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 8 }}>
                {selectedIndex !== null && <UploadForm settingsMode="regular" disabled={isVideoUploading} initialItemData={uploadQueue[selectedIndex]} formCallback={formCallback}>
                </UploadForm>}
                {selectedIndex === null && <Text ta="center">No track selected</Text>}
            </Grid.Col>
        </Grid>
    );
}