import { Anchor, Button, Checkbox, ColorInput, Fieldset, Grid, Group, Select, TagsInput, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { categoryIds } from "../types/category-ids";
import { FilterType, UploadItem } from "../types/upload";
import { CoverArtInput } from "./CoverImageInput";
import { VideoPreview } from "./VideoPreview";
import { useAuth } from "./Auth";
import { validateDescription, validateTags, validateTitle } from "../util/validate";
import { getDefaultUploadItem } from "../util/metadata";
import { useEffect } from "react";

export default function UploadForm({
    formCallback,
    disabled,
    initialItemData,
    settingsMode,
    ...props
}: {
    formCallback: (values: UploadItem) => void,
    disabled: boolean,
    initialItemData: UploadItem,
    settingsMode: "regular" | "defaults"
}) {

    const { userInfo } = useAuth();

    function handleSubmit(values: UploadItem) {
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
            metadata: {
                title: (value) => validateTitle(value, settingsMode === "defaults"),
                description: (value) => validateDescription(value, settingsMode === "defaults"),
                tags: (value) => validateTags(value)
            }
        },
        initialValues: initialItemData
    });

    useEffect(() => {
        form.setValues(initialItemData);
        form.resetDirty();
    }, [initialItemData]);

    return (
        <Fieldset disabled={disabled} legend={settingsMode === "regular" ? "Upload settings" : "Default settings"}>
            <form onSubmit={form.onSubmit(handleSubmit)} {...props}>
                <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <VideoPreview coverImage={form.getValues().imageFileBlob!} settings={form.getValues().settings} />
                        <CoverArtInput
                            form={form}
                            isDefault={settingsMode === "defaults"}
                        />
                        <Select
                            label="Render type"
                            key={form.key('settings.filterType')}
                            {...form.getInputProps('settings.filterType')}
                            data={getFilterTypeData()}
                            allowDeselect={false}
                        />
                        <Group justify="flex-end" mt="xs">
                            <Checkbox
                                label="Enable watermark"
                                key={form.key('settings.watermark')}
                                style={{ flexGrow: 1 }}
                                {...form.getInputProps('settings.watermark', { type: 'checkbox' })}
                                disabled={userInfo!.subscription === 0}
                                description="Renders choonify.com in the top right corner"
                            />
                            <ColorInput
                                key={form.key('settings.backgroundColor')}
                                size="xs"
                                style={{ ...(form.getValues().settings.filterType !== FilterType.COLOR_BACKGROUND) ? { visibility: "hidden" } : {} }}
                                {...form.getInputProps('settings.backgroundColor')}
                            />
                        </Group>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        {settingsMode === "regular" ? <TextInput
                            withAsterisk
                            label="Title"
                            placeholder="Video title"
                            key={form.key('metadata.title')}
                            {...form.getInputProps('metadata.title')}
                            description="Must be between 1-100 characters and can't contain < or >"
                        /> :
                            <Textarea
                                withAsterisk
                                label="Title"
                                description={<span>Must be at most 10000 characters. Can be a <Anchor size="xs">template string</Anchor></span>}
                                placeholder="Video title"
                                key={form.key('metadata.title')}
                                {...form.getInputProps('metadata.title')}
                                autosize
                                maxRows={10}
                            />
                        }
                        {settingsMode === "regular" ?
                            <Textarea
                                label="Description"
                                description="Must be at most 5000 characters"
                                placeholder="Video description"
                                key={form.key('metadata.description')}
                                {...form.getInputProps('metadata.description')}
                                autosize
                                maxRows={10}
                            /> : <Textarea
                                label="Description"
                                description={<span>Must be at most 10000 characters. Can be a <Anchor size="xs">template string</Anchor></span>}
                                placeholder="Video description"
                                key={form.key('metadata.description')}
                                {...form.getInputProps('metadata.description')}
                                autosize
                                maxRows={10}
                            />
                        }
                        <TagsInput
                            label="Tags"
                            description="Must be at most 500 characters"
                            key={form.key('metadata.tags')}
                            {...form.getInputProps('metadata.tags')}
                        />
                        <Select
                            label="Category"
                            key={form.key('metadata.categoryId')}
                            {...form.getInputProps('metadata.categoryId')}
                            data={categoryIds}
                            allowDeselect={false}
                        />
                        <Select
                            label="Visibility"
                            key={form.key('metadata.visibility')}
                            {...form.getInputProps('metadata.visibility')}
                            data={getVisibilityData()}
                            allowDeselect={false}
                        />
                        <Checkbox
                            label="Made for kids"
                            mt="sm"
                            key={form.key('metadata.madeForKids')}
                            {...form.getInputProps('metadata.madeForKids', { type: 'checkbox' })}
                        />
                        <Checkbox
                            label="Notify subscribers"
                            mt="sm"
                            key={form.key('metadata.notifySubscribers')}
                            {...form.getInputProps('metadata.notifySubscribers', { type: 'checkbox' })}
                        />
                    </Grid.Col>
                </Grid>

                <Group justify="flex-end" mt="md">
                    {settingsMode === "defaults" && <Button onClick={() => { form.setValues(getDefaultUploadItem()) }}>Reset defaults</Button>}
                    <Button disabled={!form.isDirty()} onClick={form.reset}>Cancel</Button>
                    <Button type="submit" disabled={!form.isDirty()}>Save</Button>
                </Group>
            </form>
        </Fieldset >
    );
}