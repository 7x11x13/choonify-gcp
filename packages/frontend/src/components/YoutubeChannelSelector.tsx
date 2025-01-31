import { Avatar, Combobox, InputBase, useCombobox, Text, Loader, Input, Group, Button } from '@mantine/core';
import { useEffect, useState } from 'react';
import { YouTubeChannel } from '../types/auth';
import { useAuth, useGSI } from './Auth';
import { apiGet, apiPost } from '../util/aws';
import config from '../config';


async function getAuthorizedChannels(): Promise<YouTubeChannel[]> {
    const data = await apiGet("/channels") as any[];
    return data.map((channel) => ({
        id: channel.channelId,
        imageUrl: channel.info.picture,
        name: channel.info.name,
    }));
}


export function ChannelSelector({ selectedChannelId, refreshState }: { selectedChannelId: React.RefObject<string | null>, refreshState: any }) {
    const { user } = useAuth();
    const [selectedValue, setSelectedValue] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<YouTubeChannel[]>([]);
    const combobox = useCombobox({
        onDropdownClose: () => combobox.resetSelectedOption(),
    });
    const gsiLoaded = useGSI();

    function setSelected(value: string | null) {
        setSelectedValue(value);
        selectedChannelId.current = value;
    }

    function getSelectedItem() {
        const item = data.find((info) => info.id === selectedValue);
        return item
    }

    async function reload() {
        setLoading(true);
        try {
            const channels = await getAuthorizedChannels();
            setData(channels);
            if (!selectedValue && channels.length > 0) {
                setSelected(channels[0].id);
            }
        } catch (err) {
            console.error("Error loading authorized channels:", err);
        }
        setLoading(false);
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
                    await reload();
                } else {
                    setLoading(false);
                }
            },
        });
        client.requestCode();
    }

    useEffect(() => {
        setSelected(null);
        if (user) {
            reload();
        }
    }, [refreshState]);

    const options = data.map((item) => (
        <Combobox.Option value={item.id} key={item.id}>
            <Group>
                <Avatar src={item.imageUrl} alt={item.name} radius="xl" size={30} /><Text>{item.name}</Text>
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
                        {selectedValue && <Group>
                            <Avatar src={getSelectedItem()!.imageUrl} alt={getSelectedItem()!.name} radius="xl" size={24} />
                            <Text>{getSelectedItem()!.name}</Text>
                        </Group>}
                        {!selectedValue && <Input.Placeholder>No channel selected</Input.Placeholder>}
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