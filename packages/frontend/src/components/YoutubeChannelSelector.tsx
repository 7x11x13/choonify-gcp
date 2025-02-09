import { Avatar, Button, Combobox, Group, Input, InputBase, Loader, Text, useCombobox } from '@mantine/core';
import { useEffect, useState } from 'react';
import config from '../config';
import { YTChannel } from '../types/auth';
import { apiPost } from '../util/aws';
import { useAuth, useGSI } from './Auth';
import { useUncontrolled } from '@mantine/hooks';

interface ChannelSelectorProps {
    value?: string;
    defaultValue?: string;
    onChange: (value: string) => void;
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

    return (
        <Group>
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
            <Button onClick={authNewChannel}>Add channel</Button>
        </Group>
    );
}