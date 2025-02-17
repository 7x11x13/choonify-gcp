import { Avatar, Burger, Button, Group, Menu, Modal, Stack, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import cx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BsBoxArrowRight, BsChevronDown, BsFillGearFill, BsTrash } from 'react-icons/bs';
import { Link, useNavigate } from 'react-router-dom';
import { displaySuccess } from '../util/log';
import { useAuth } from './Auth';
import GoogleLoginButton from './GoogleLoginButton';
import classes from './Header.module.css';

export function Header() {
    const [opened, { toggle }] = useDisclosure(false);
    const [userMenuOpened, setUserMenuOpened] = useState(false);
    const { user, loading, signOut } = useAuth();
    const [deleteModalOpened, { open: deleteModalOpen, close: deleteModalClose }] = useDisclosure(false);
    const { t } = useTranslation();

    const links = [
        { link: '/about', label: t('header.label.features') },
        { link: '/pricing', label: t('header.label.pricing') },
    ];

    let navigate = useNavigate();

    const items = links.map((link) => (
        <a
            key={link.label}
            href={link.link}
            className={classes.link}
            onClick={(event) => event.preventDefault()}
        >
            {link.label}
        </a>
    ));

    if (loading) {
        return;
    }

    async function deleteUserAccount() {
        await (await import('../util/api')).deleteAccount();
        await signOut();
        deleteModalClose();
        displaySuccess(t('header.account-scheduled-for-deletion'));
    }

    return (
        <header className={classes.header}>
            <div className={classes.inner}>
                <Modal opened={deleteModalOpened} onClose={deleteModalClose} title="Delete Account">
                    <Stack>
                        <Text>{t('header.deletion-warning')}</Text>
                        <Group justify='right'>
                            <Button onClick={deleteModalClose}>{t('header.go-back')}</Button>
                            <Button onClick={deleteUserAccount}>{t('header.delete-confirmation')}</Button>
                        </Group>
                    </Stack>
                </Modal>
                <Group>
                    <Burger opened={opened} onClick={toggle} size="sm" hiddenFrom="sm" />
                    <h1><Link to="/" style={{ textDecoration: 'none', color: 'black' }}>Choonify</Link></h1>
                </Group>
                <Group>
                    <Group ml={50} gap={5} className={classes.links} visibleFrom="sm">
                        {items}
                    </Group>
                    {!user && <GoogleLoginButton></GoogleLoginButton>}
                    {user && <Menu
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
                                    <Avatar src={user.photoURL} alt={user.displayName || "User"} radius="xl" size={30} />
                                    {/* <Text fw={500} size="sm" lh={1} mr={3}>
                                        {user.attributes.name}
                                    </Text> */}
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
                    </Menu>}
                </Group>
            </div>
        </header>
    );
}