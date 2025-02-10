import { ActionIcon, Avatar, Combobox, Group, Input, InputBase, Loader, Text, Tooltip, useCombobox } from '@mantine/core';
import { useUncontrolled } from '@mantine/hooks';
import { useEffect, useState } from 'react';
import { BsDash, BsPlus } from 'react-icons/bs';
import config from '../config';
import { YTChannel } from '../types/auth';
import { apiPost } from '../util/aws';
import { displayError } from '../util/log';
import { useAuth, useGSI } from './Auth';

interface ChannelSelectorProps {
    value?: string;
    defaultValue?: string;
    onChange: (value: string) => void;
}

function maxChannels(subscription: number) {
    return (subscription === 0) ? 1 : 10;
}

export function ChannelSelector({ onChange, value, defaultValue }: ChannelSelectorProps) {
    const { user, userInfo, refreshUserInfo } = useAuth();
    const [_value, setValue] = useUncontrolled({
        value,
        defaultValue,
        finalValue: '',
        onChange,
    });
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<YTChannel[]>([]);
    const combobox = useCombobox({
        onDropdownClose: () => combobox.resetSelectedOption(),
    });
    const gsiLoaded = useGSI();

    useEffect(() => {
        const channels = userInfo?.channels ?? [];
        setData(channels);
        if (!_value && channels.length > 0) {
            if (userInfo?.settings.defaultChannelId) {
                setSelected(userInfo.settings.defaultChannelId);
            } else {
                setSelected(channels[0].channelId);
            }
        }
    }, [userInfo?.channels]);

    function setSelected(value: string | null) {
        setValue(value ?? "");
        onChange(value ?? "");
    }

    function getSelectedItem() {
        const item = data.find((info) => info.channelId === _value);
        return item
    }

    async function removeChannel() {
        // TODO
    }

    async function authNewChannel() {
        if (!user || !gsiLoaded) {
            console.error("user not logged in or gsi not loaded");
            return;
        }
        setLoading(true);
        const client = google.accounts.oauth2.initCodeClient({
            client_id: config.google.CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
            ux_mode: 'popup',
            login_hint: user.providerData[0].uid,
            callback: async (response) => {
                const r = await apiPost("/oauth", { code: response.code });
                if (r !== undefined) {
                    await refreshUserInfo();
                }
                setLoading(false);
            },
            error_callback: (err) => {
                console.error(err);
                displayError(err.message)
                setLoading(false);
            },
        });
        client.requestCode();
    }

    const options = data.map((item) => (
        <Combobox.Option value={item.channelId} key={item.channelId}>
            <Group>
                <Avatar src={item.picture} alt={item.name} radius="xl" size={30} /><Text>{item.name}</Text>
            </Group>
        </Combobox.Option>
    ));

    const isFull = userInfo!.channels.length >= maxChannels(userInfo!.subscription);
    const isEmpty = userInfo!.channels.length === 0;

    return (
        <Group gap="xs">
            <Combobox
                store={combobox}
                withinPortal={false}
                onOptionSubmit={(val) => {
                    setSelected(val);
                    combobox.closeDropdown();
                }}
            >
                <Combobox.Target>
                    <InputBase
                        component="button"
                        type="button"
                        pointer
                        rightSection={loading ? <Loader size={18} /> : <Combobox.Chevron />}
                        onClick={() => combobox.toggleDropdown()}
                        rightSectionPointerEvents="none"
                        style={{ flexGrow: 1 }}
                    >
                        {_value && <Group>
                            <Avatar src={getSelectedItem()?.picture} alt={getSelectedItem()?.name} radius="xl" size={24} />
                            <Text>{getSelectedItem()?.name}</Text>
                        </Group>}
                        {!_value && <Input.Placeholder>No channel selected</Input.Placeholder>}
                    </InputBase>
                </Combobox.Target>

                <Combobox.Dropdown>
                    <Combobox.Options>
                        {loading ? <Combobox.Empty>Loading....</Combobox.Empty> : options}
                    </Combobox.Options>
                </Combobox.Dropdown>
            </Combobox>
            <Tooltip label={"Link channel"}>
                <ActionIcon size="lg" color="green" onClick={authNewChannel} disabled={isFull}>
                    <BsPlus size="lg"></BsPlus>
                </ActionIcon>
            </Tooltip>
            <Tooltip label={"Unlink channel"}>
                <ActionIcon size="lg" color="red" onClick={removeChannel} disabled={isEmpty}>
                    <BsDash size="lg"></BsDash>
                </ActionIcon>
            </Tooltip>
        </Group>
    );
}