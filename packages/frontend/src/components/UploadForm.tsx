import { Anchor, Button, Checkbox, ColorInput, Fieldset, Grid, Group, Select, TagsInput, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { UserSettings } from "../types/auth";
import { getCategoryIdData } from "../types/category-ids";
import { getDefaultUserSettings } from "../types/defaults";
import { FilterType } from "../types/upload";
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
    const { t } = useTranslation();
    const isFree = userInfo!.subscription === 0;

    function handleSubmit(values: UserSettings) {
        form.resetDirty();
        formCallback(values);
    }

    function getFilterTypeData() {
        return [
            {
                value: FilterType.BLACK_BACKGROUND,
                label: t('types.filtertype.black-background')
            },
            {
                value: FilterType.COLOR_BACKGROUND,
                label: isFree ? t('types.filtertype.colored-background-premium') : t('types.filtertype.colored-background'),
                disabled: isFree
            },
            {
                value: FilterType.BLURRED_BACKGROUND,
                label: isFree ? t('types.filtertype.blurred-background-premium') : t('types.filtertype.blurred-background'),
                disabled: isFree
            }
        ];
    }

    function getVisibilityData() {
        return [
            {
                value: "public",
                label: t('types.visibility.public')
            },
            {
                value: "unlisted",
                label: t('types.visibility.unlisted')
            },
            {
                value: "private",
                label: t('types.visibility.private')
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
            <Fieldset disabled={disabled} legend={settingsMode === "regular" ? t('upload_form.upload-settings') : t('upload_form.default-settings')}>
                <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <VideoPreview coverImage={form.getValues().defaults.imageFileBlob!} settings={form.getValues().defaults.settings} />
                        <CoverArtInput
                            form={form}
                        />
                        <Select
                            label={t('upload_form.label.render-type')}
                            key={form.key('defaults.settings.filterType')}
                            {...form.getInputProps('defaults.settings.filterType')}
                            data={getFilterTypeData()}
                            allowDeselect={false}
                        />
                        <Group justify="flex-end" mt="xs">
                            <Checkbox
                                label={t('upload_form.label.enable-watermark')}
                                key={form.key('defaults.settings.watermark')}
                                style={{ flexGrow: 1 }}
                                {...form.getInputProps('defaults.settings.watermark', { type: 'checkbox' })}
                                disabled={isFree}
                                description={t('upload_form.description.watermark')}
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
                            label={t('upload_form.label.title')}
                            placeholder={t('upload_form.placeholder.title')}
                            key={form.key('defaults.metadata.title')}
                            {...form.getInputProps('defaults.metadata.title')}
                            description={t('upload_form.description.title1')}
                        /> :
                            <Textarea
                                withAsterisk
                                label={t('upload_form.label.title')}
                                description={<span>
                                    <Trans t={t} i18nKey="upload_form.description.template-string" components={[<Anchor size="xs" />]} />
                                </span>}
                                placeholder={t('upload_form.placeholder.title')}
                                key={form.key('defaults.metadata.title')}
                                {...form.getInputProps('defaults.metadata.title')}
                                autosize
                                maxRows={10}
                            />
                        }
                        {settingsMode === "regular" ?
                            <Textarea
                                label={t('upload_form.label.description')}
                                description={t('upload_form.description.description1')}
                                placeholder={t('upload_form.placeholder.description')}
                                key={form.key('defaults.metadata.description')}
                                {...form.getInputProps('defaults.metadata.description')}
                                autosize
                                maxRows={10}
                            /> : <Textarea
                                label={t('upload_form.label.description')}
                                description={<span>
                                    <Trans t={t} i18nKey="upload_form.description.template-string" components={[<Anchor size="xs" />]} />
                                </span>}
                                placeholder={t('upload_form.placeholder.description')}
                                key={form.key('defaults.metadata.description')}
                                {...form.getInputProps('defaults.metadata.description')}
                                autosize
                                maxRows={10}
                            />
                        }
                        <TagsInput
                            label={t('upload_form.label.tags')}
                            description={t('upload_form.description.tags')}
                            key={form.key('defaults.metadata.tags')}
                            {...form.getInputProps('defaults.metadata.tags')}
                        />
                        <Select
                            label={t('upload_form.label.category')}
                            key={form.key('defaults.metadata.categoryId')}
                            {...form.getInputProps('defaults.metadata.categoryId')}
                            data={getCategoryIdData()}
                            allowDeselect={false}
                        />
                        <Select
                            label={t('upload_form.label.visibility')}
                            key={form.key('defaults.metadata.visibility')}
                            {...form.getInputProps('defaults.metadata.visibility')}
                            data={getVisibilityData()}
                            allowDeselect={false}
                        />
                        <Checkbox
                            label={t('upload_form.label.made-for-kids')}
                            mt="sm"
                            key={form.key('defaults.metadata.madeForKids')}
                            {...form.getInputProps('defaults.metadata.madeForKids', { type: 'checkbox' })}
                        />
                        <Checkbox
                            label={t('upload_form.label.notify-subscribers')}
                            mt="sm"
                            key={form.key('defaults.metadata.notifySubscribers')}
                            {...form.getInputProps('defaults.metadata.notifySubscribers', { type: 'checkbox' })}
                        />
                    </Grid.Col>
                </Grid>
                <Group justify="flex-end" mt="md">
                    {settingsMode === "defaults" && <Button onClick={() => { form.setValues(getDefaultUserSettings()) }}>{t('upload_form.button.reset-defaults')}</Button>}
                    <Button disabled={!form.isDirty()} onClick={form.reset}>{t('button.cancel')}</Button>
                    <Button type="submit" disabled={!form.isDirty()}>{t('button.save')}</Button>
                </Group>
            </Fieldset>
        </form>
    );
}