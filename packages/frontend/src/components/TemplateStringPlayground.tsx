import { Fieldset, FileInput, Grid, Textarea } from "@mantine/core";
import { useState } from "react";
import { TemplateStringInput } from "../types/template";
import { FileWithPath } from "@mantine/dropzone";
import { getDefaultTitleTemplateString } from "../types/defaults";
import { Eta } from "eta";
import { getFileMetadata, getTemplateStringInput } from "../util/metadata";

const eta = new Eta({ debug: true });

function getDefaultTemplateInput(): TemplateStringInput {
  const file = {
    lastModified: 1734487372000,
    name: "tour around canada [1988534755].m4a",
    path: "./tour around canada [1988534755].m4a",
    relativePath: "./tour around canada [1988534755].m4a",
    size: 3083160,
    type: "audio/x-m4a",
    webkitRelativePath: "",
  } as FileWithPath;
  return {
    metadata: {
      track: {
        no: null,
        of: null,
      },
      disk: {
        no: null,
        of: null,
      },
      movementIndex: {
        no: null,
        of: null,
      },
      title: "tour around canada",
      artists: ["Andy pls"],
      artist: "Andy pls",
      year: 2024,
      date: "20241218",
      encodedby: "Lavf61.7.100",
      comment: [
        {
          text: "https://soundcloud.com/andy-pls/tour-around-canada",
        },
      ],
      genre: ["Breakcore"],
      description: [
        "this one goes out to all my canadians\n\nfull comp here thx for invite 😌 https://zisatsu.bandcamp.com/album/hiphop-junkie-and-hxcx-junkie",
      ],
      longDescription:
        "this one goes out to all my canadians\n\nfull comp here thx for invite 😌 https://zisatsu.bandcamp.com/album/hiphop-junkie-and-hxcx-junkie",
    },
    format: {
      tagTypes: ["iTunes"],
      trackInfo: [
        {
          codecName: "MPEG-4/AAC",
          type: 2,
          audio: {
            samplingFrequency: 44100,
            bitDepth: 16,
            channels: 2,
          },
        },
      ],
      container: "M4A/isom/iso2",
      creationTime: new Date("1904-01-01T00:00:00.000Z"),
      modificationTime: new Date("1904-01-01T00:00:00.000Z"),
      codec: "MPEG-4/AAC",
      duration: 144.59065759637187,
      sampleRate: 44100,
      bitsPerSample: 16,
      numberOfChannels: 2,
      lossless: false,
      bitrate: 169133.19578549062,
    },
    file,
  };
}

export default function TemplateStringPlayground() {
  const [templateString, setTemplateString] = useState(
    getDefaultTitleTemplateString(),
  );
  const [templateInput, setTemplateInput] = useState(getDefaultTemplateInput());

  async function onFileChange(file: File | null) {
    if (!file) {
      return;
    }
    const metadata = await getFileMetadata(file);
    if (!metadata) {
      return;
    }
    const input = await getTemplateStringInput(file, metadata);
    setTemplateInput(input);
  }

  function renderOutput(template: string, input: TemplateStringInput) {
    try {
      return { value: eta.renderString(template, input), error: false };
    } catch (err: any) {
      console.log(err);
      return { value: err.toString(), error: true };
    }
  }

  return (
    <Grid mb="md">
      <Grid.Col span={{ base: 12, sm: 6 }}>
        <Textarea
          label="Template string"
          autosize
          maxRows={10}
          value={templateString}
          onChange={(event) => setTemplateString(event.currentTarget.value)}
        />
        <FileInput
          label="Audio file"
          onChange={onFileChange}
          value={templateInput.file}
          accept="audio/*"
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6 }}>
        <Textarea
          label="Output"
          readOnly
          autosize
          maxRows={10}
          {...renderOutput(templateString, templateInput)}
        />
      </Grid.Col>
    </Grid>
  );
}
