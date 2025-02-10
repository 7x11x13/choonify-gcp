import { Anchor, Button, Checkbox, ColorInput, Fieldset, Grid, Group, Select, TagsInput, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect } from "react";
import { UserSettings } from "../types/auth";
import { categoryIds } from "../types/category-ids";
import { FilterType } from "../types/upload";
import { getDefaultUserSettings } from "../types/defaults";
import { validateDescription, validateTags, validateTitle } from "../util/validate";
import { useAuth } from "./Auth";
import { CoverArtInput } from "./CoverImageInput";
import { VideoPreview } from "./VideoPreview";
import { ChannelSelector } from "./YoutubeChannelSelector";

export default function UploadForm({
    formCallback,
    disabled,
    initialItemData,
    settingsMode,
    ...props
}: {
    formCallback: (values: UserSettings) => void,
    disabled: boolean,
    initialItemData: UserSettings,
    settingsMode: "regular" | "defaults"
}) {

    const { userInfo } = useAuth();

    function handleSubmit(values: UserSettings) {
        form.resetDirty();
        formCallback(values);
    }

    function getFilterTypeData() {
        return [
            {
                value: FilterType.BLACK_BACKGROUND,
                label: "Black background"
            },
            {
                value: FilterType.COLOR_BACKGROUND,
                label: userInfo!.subscription === 0 ? "Colored background (Premium)" : "Colored background",
                disabled: userInfo!.subscription === 0
            },
            {
                value: FilterType.BLURRED_BACKGROUND,
                label: userInfo!.subscription === 0 ? "Blurred background (Premium)" : "Blurred background",
                disabled: userInfo!.subscription === 0
            }
        ];
    }

    function getVisibilityData() {
        return [
            {
                value: "public",
                label: "Public"
            },
            {
                value: "unlisted",
                label: "Unlisted"
            },
            {
                value: "private",
                label: "Private"
            },
        ]
    }

    const form = useForm({
        mode: 'controlled',
        validate: {
            defaults: {
                metadata: {
                    title: (value) => validateTitle(value, settingsMode === "defaults"),
                    description: (value) => validateDescription(value, settingsMode === "defaults"),
                    tags: (value) => validateTags(value)
                }
            }
        },
        initialValues: initialItemData
    });

    useEffect(() => {
        form.setValues(initialItemData);
        form.resetDirty();
    }, [initialItemData]);

    return (
        <form onSubmit={form.onSubmit(handleSubmit)} {...props}>
            <Fieldset disabled={disabled} legend={settingsMode === "regular" ? "Upload settings" : "Default settings"}>
                <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <VideoPreview coverImage={form.getValues().defaults.imageFileBlob!} settings={form.getValues().defaults.settings} />
                        <CoverArtInput
                            form={form}
                        />
                        <Select
                            label="Render type"
                            key={form.key('defaults.settings.filterType')}
                            {...form.getInputProps('defaults.settings.filterType')}
                            data={getFilterTypeData()}
                            allowDeselect={false}
                        />
                        <Group justify="flex-end" mt="xs">
                            <Checkbox
                                label="Enable watermark"
                                key={form.key('defaults.settings.watermark')}
                                style={{ flexGrow: 1 }}
                                {...form.getInputProps('defaults.settings.watermark', { type: 'checkbox' })}
                                disabled={userInfo!.subscription === 0}
                                description="Renders choonify.com in the top right corner"
                            />
                            <ColorInput
                                key={form.key('defaults.settings.backgroundColor')}
                                size="xs"
                                style={{ ...(form.getValues().defaults.settings.filterType !== FilterType.COLOR_BACKGROUND) ? { visibility: "hidden" } : {} }}
                                {...form.getInputProps('defaults.settings.backgroundColor')}
                            />
                        </Group>
                        {settingsMode === "defaults" && <ChannelSelector {...form.getInputProps("defaultChannelId")}></ChannelSelector>}
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        {settingsMode === "regular" ? <TextInput
                            withAsterisk
                            label="Title"
                            placeholder="Video title"
                            key={form.key('defaults.metadata.title')}
                            {...form.getInputProps('defaults.metadata.title')}
                            description="Must be between 1-100 characters and can't contain < or >"
                        /> :
                            <Textarea
                                withAsterisk
                                label="Title"
                                description={<span>Must be at most 10000 characters. Can be a <Anchor size="xs">template string</Anchor></span>}
                                placeholder="Video title"
                                key={form.key('defaults.metadata.title')}
                                {...form.getInputProps('defaults.metadata.title')}
                                autosize
                                maxRows={10}
                            />
                        }
                        {settingsMode === "regular" ?
                            <Textarea
                                label="Description"
                                description="Must be at most 5000 characters"
                                placeholder="Video description"
                                key={form.key('defaults.metadata.description')}
                                {...form.getInputProps('defaults.metadata.description')}
                                autosize
                                maxRows={10}
                            /> : <Textarea
                                label="Description"
                                description={<span>Must be at most 10000 characters. Can be a <Anchor size="xs">template string</Anchor></span>}
                                placeholder="Video description"
                                key={form.key('defaults.metadata.description')}
                                {...form.getInputProps('defaults.metadata.description')}
                                autosize
                                maxRows={10}
                            />
                        }
                        <TagsInput
                            label="Tags"
                            description="Must be at most 500 characters"
                            key={form.key('defaults.metadata.tags')}
                            {...form.getInputProps('defaults.metadata.tags')}
                        />
                        <Select
                            label="Category"
                            key={form.key('defaults.metadata.categoryId')}
                            {...form.getInputProps('defaults.metadata.categoryId')}
                            data={categoryIds}
                            allowDeselect={false}
                        />
                        <Select
                            label="Visibility"
                            key={form.key('defaults.metadata.visibility')}
                            {...form.getInputProps('defaults.metadata.visibility')}
                            data={getVisibilityData()}
                            allowDeselect={false}
                        />
                        <Checkbox
                            label="Made for kids"
                            mt="sm"
                            key={form.key('defaults.metadata.madeForKids')}
                            {...form.getInputProps('defaults.metadata.madeForKids', { type: 'checkbox' })}
                        />
                        <Checkbox
                            label="Notify subscribers"
                            mt="sm"
                            key={form.key('defaults.metadata.notifySubscribers')}
                            {...form.getInputProps('defaults.metadata.notifySubscribers', { type: 'checkbox' })}
                        />
                    </Grid.Col>
                </Grid>
                <Group justify="flex-end" mt="md">
                    {settingsMode === "defaults" && <Button onClick={() => { form.setValues(getDefaultUserSettings()) }}>Reset defaults</Button>}
                    <Button disabled={!form.isDirty()} onClick={form.reset}>Cancel</Button>
                    <Button type="submit" disabled={!form.isDirty()}>Save</Button>
                </Group>
            </Fieldset>
        </form>
    );
}