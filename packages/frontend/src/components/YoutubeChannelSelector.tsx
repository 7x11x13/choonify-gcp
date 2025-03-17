import {
  ActionIcon,
  Avatar,
  Combobox,
  Group,
  Input,
  InputBase,
  InputLabel,
  InputWrapper,
  Loader,
  Text,
  Tooltip,
  useCombobox,
} from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { BsDash, BsPlus } from "react-icons/bs";
import config from "../config";
import { YTChannel } from "../types/auth";
import { apiPost } from "../util/api";
import { displayError } from "../util/log";
import { useAuth, useGSI } from "./Auth";
import { useTranslation } from "react-i18next";

import "@mantine/core/styles/ActionIcon.css";
import "@mantine/core/styles/Combobox.css";
import "@mantine/core/styles/Tooltip.css";

interface ChannelSelectorProps {
  value?: string;
  defaultValue?: string;
  onChange: (value: string) => void;
}

function maxChannels(subscription: number) {
  return subscription === 0 ? 1 : 10;
}

export function ChannelSelector({
  onChange,
  value,
  defaultValue,
}: ChannelSelectorProps) {
  const { user, userInfo, refreshUserInfo } = useAuth();
  const [_value, setValue] = useUncontrolled({
    value,
    defaultValue,
    finalValue: "",
    onChange,
  });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<YTChannel[]>([]);
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const gsiLoaded = useGSI();
  const { t } = useTranslation();

  useEffect(() => {
    const channels = userInfo?.channels ?? [];
    setData(channels);
    if (userInfo?.settings.defaultChannelId) {
      setSelected(userInfo.settings.defaultChannelId);
      return;
    }
    if (!_value || !channels.find((channel) => channel.channelId === _value)) {
      setSelected(channels[0]?.channelId);
    }
  }, [userInfo?.channels]);

  function setSelected(value: string | null | undefined) {
    setValue(value ?? "");
    onChange(value ?? "");
  }

  function getSelectedItem() {
    const item = data.find((info) => info.channelId === _value);
    return item;
  }

  async function removeChannel() {
    if (!_value) {
      return;
    }
    setLoading(true);
    await apiPost("/remove-channel", {
      channelId: _value,
    });
    await refreshUserInfo();
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
      scope:
        "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
      ux_mode: "popup",
      callback: async (response) => {
        const r = await apiPost("/oauth", { code: response.code });
        if (r !== undefined) {
          await refreshUserInfo();
        }
        setLoading(false);
      },
      error_callback: (err) => {
        console.error(err);
        displayError(err.message);
        setLoading(false);
      },
    });
    client.requestCode();
  }

  const options = data.map((item) => (
    <Combobox.Option value={item.channelId} key={item.channelId}>
      <Group>
        <Avatar src={item.picture} alt={item.name} radius="xl" size={30} />
        <Text>{item.name}</Text>
      </Group>
    </Combobox.Option>
  ));

  const isFull =
    userInfo!.channels.length >= maxChannels(userInfo!.subscription);

  return (
    <InputWrapper>
      <InputLabel>{t("channel_selector.label")}</InputLabel>
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
              rightSection={
                loading ? <Loader size={18} /> : <Combobox.Chevron />
              }
              onClick={() => combobox.toggleDropdown()}
              rightSectionPointerEvents="none"
              style={{ flexGrow: 1 }}
            >
              {_value && (
                <Group>
                  <Avatar
                    src={getSelectedItem()?.picture}
                    alt={getSelectedItem()?.name}
                    radius="xl"
                    size={24}
                  />
                  <Text>{getSelectedItem()?.name}</Text>
                </Group>
              )}
              {!_value && (
                <Input.Placeholder>
                  {t("channel_selector.no-channel-selected")}
                </Input.Placeholder>
              )}
            </InputBase>
          </Combobox.Target>

          <Combobox.Dropdown>
            <Combobox.Options>
              {loading ? (
                <Combobox.Empty>{t("loading")}</Combobox.Empty>
              ) : (
                options
              )}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
        <Tooltip label={t("channel_selector.link-channel")}>
          <ActionIcon
            size="lg"
            color="green"
            onClick={authNewChannel}
            disabled={isFull || !gsiLoaded}
          >
            <BsPlus size="2rem"></BsPlus>
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t("channel_selector.unlink-channel")}>
          <ActionIcon
            size="lg"
            color="red"
            onClick={removeChannel}
            disabled={!_value || getSelectedItem()?.primary}
          >
            <BsDash size="2rem"></BsDash>
          </ActionIcon>
        </Tooltip>
      </Group>
    </InputWrapper>
  );
}
