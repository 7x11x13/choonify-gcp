import { useEffect, useRef, useState } from "react";
import { FilterType, RenderSettings } from "../types/upload";
import { InputLabel, InputWrapper, Loader, Text } from "@mantine/core";
import * as StackBlur from 'stackblur-canvas';

export function VideoPreview({ coverImage, settings, ...props }: { coverImage: File, settings: RenderSettings }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    function onError(...any: any[]) {
        console.error("Preview error:", ...any);
        setError(true);
    }

    function drawWatermark(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
        const fontSize = canvas.height / 20;
        ctx.font = `${fontSize}px arial`;
        ctx.fillStyle = "white";
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeText("choonify.com", canvas.width - fontSize * 6, fontSize);
        ctx.fillText("choonify.com", canvas.width - fontSize * 6, fontSize);
    }

    function loadImageElement(image: File, onLoad: (img: HTMLImageElement) => void) {
        const url = URL.createObjectURL(image);
        const img = new Image();
        img.onload = function () {
            onLoad(img);
            URL.revokeObjectURL(url);
        }
        img.onerror = onError;
        img.src = url;
    }

    useEffect(() => {
        if (!coverImage) {
            return;
        }
        const canvas = canvasRef.current!;
        const width = canvas.width;
        canvas.height = width * 1080 / 1920;
        const height = canvas.height;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, width, height);
        switch (settings.filterType) {
            case FilterType.BLACK_BACKGROUND:
                ctx.fillStyle = "black";
                ctx.fillRect(0, 0, width, height);
                loadImageElement(coverImage, (img) => {
                    // scale image to fit height
                    const scale = canvas.height / img.height;
                    const offsetX = (canvas.width - img.width * scale) / 2;
                    ctx.drawImage(img, offsetX, 0, img.width * scale, img.height * scale);
                    if (settings.watermark) {
                        drawWatermark(canvas, ctx);
                    }
                    setLoading(false);
                });
                break;
            case FilterType.COLOR_BACKGROUND:
                ctx.fillStyle = settings.backgroundColor;
                ctx.fillRect(0, 0, width, height);
                loadImageElement(coverImage, (img) => {
                    // scale image to fit height
                    const scale = canvas.height / img.height;
                    const offsetX = (canvas.width - img.width * scale) / 2;
                    ctx.drawImage(img, offsetX, 0, img.width * scale, img.height * scale);
                    if (settings.watermark) {
                        drawWatermark(canvas, ctx);
                    }
                    setLoading(false);
                });
                break;
            case FilterType.BLURRED_BACKGROUND:
                loadImageElement(coverImage, (img) => {
                    // scale image to fit width
                    let scale = canvas.width / img.width;
                    const offsetY = (canvas.height - img.height * scale) / 2;
                    ctx.drawImage(img, 0, offsetY, img.width * scale, img.height * scale);
                    StackBlur.canvasRGB(canvas, 0, 0, canvas.width, canvas.height, 20);
                    scale = canvas.height / img.height;
                    const offsetX = (canvas.width - img.width * scale) / 2;
                    ctx.drawImage(img, offsetX, 0, img.width * scale, img.height * scale);
                    if (settings.watermark) {
                        drawWatermark(canvas, ctx);
                    }
                    setLoading(false);
                });
                break;
        }
    }, [coverImage, ...Object.values(settings)]);

    if (error) {
        return <Text>Error creating preview</Text>
    }


    return <InputWrapper><InputLabel>Preview</InputLabel>{loading && <Loader>Loading preview</Loader>}
        <canvas ref={canvasRef} style={{ width: "100%", ...(loading ? { display: "none" } : {}) }} {...props} width={1280} height={720}></canvas></InputWrapper>
}