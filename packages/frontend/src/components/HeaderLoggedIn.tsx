import { Modal, Stack, Group, Button, Menu, UnstyledButton, Avatar, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { t } from 'i18next';
import { useState } from 'react';
import { BsChevronDown, BsFillGearFill, BsBoxArrowRight, BsTrash } from 'react-icons/bs';
import { useNavigate } from 'react-router-dom';
import { displaySuccess } from '../util/log';
import { useAuth } from './Auth';
import cx from 'clsx';

import classes from './Header.module.css';

export default function HeaderLoggedIn() {

    const [userMenuOpened, setUserMenuOpened] = useState(false);
    const [deleteModalOpened, { open: deleteModalOpen, close: deleteModalClose }] = useDisclosure(false);
    let navigate = useNavigate();
    const { user, signOut } = useAuth();

    async function deleteUserAccount() {
        await (await import('../util/api')).deleteAccount();
        await signOut();
        deleteModalClose();
        displaySuccess(t('header.account-scheduled-for-deletion'));
    }

    return <>
        <Modal opened={deleteModalOpened} onClose={deleteModalClose} title={t('header.delete-account')}>
            <Stack>
                <Text>{t('header.deletion-warning')}</Text>
                <Group justify='right'>
                    <Button onClick={deleteModalClose}>{t('header.go-back')}</Button>
                    <Button onClick={deleteUserAccount}>{t('header.delete-confirmation')}</Button>
                </Group>
            </Stack>
        </Modal>
        <Menu
            width={260}
            position="bottom-end"
            transitionProps={{ transition: 'pop-top-right' }}
            onClose={() => setUserMenuOpened(false)}
            onOpen={() => setUserMenuOpened(true)}
            withinPortal
        >
            <Menu.Target>
                <UnstyledButton
                    className={cx(classes.user, { [classes.userActive]: userMenuOpened })}
                >
                    <Group gap={7}>
                        <Avatar src={user!.photoURL} alt={user!.displayName || "User"} radius="xl" size={30} />
                        <BsChevronDown size={12} stroke={"1.5"} />
                    </Group>
                </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Item leftSection={<BsFillGearFill size={16} stroke={"1.5"} />} onClick={() => navigate("/settings")}>
                    {t('header.account-settings')}
                </Menu.Item>
                <Menu.Item leftSection={<BsBoxArrowRight size={16} stroke={"1.5"} />} onClick={signOut}>{t('header.logout')}</Menu.Item>

                <Menu.Divider />

                <Menu.Label>{t('header.danger-zone')}</Menu.Label>
                <Menu.Item color="red" leftSection={<BsTrash size={16} stroke={"1.5"} />} onClick={deleteModalOpen}>
                    {t('header.delete-account')}
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    </>
}