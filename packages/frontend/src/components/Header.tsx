import { BsBoxArrowRight, BsChevronDown, BsFillGearFill, BsTrash } from 'react-icons/bs';
import { Avatar, Burger, Group, Menu, UnstyledButton, Text, Modal, Button, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import classes from './Header.module.css';
import { useState } from 'react';
import { useAuth } from './Auth';
import cx from 'clsx';
import GoogleLoginButton from './GoogleLoginButton';
import { Link, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';

const links = [
    { link: '/about', label: 'Features' },
    { link: '/pricing', label: 'Pricing' },
];

export function Header() {
    const [opened, { toggle }] = useDisclosure(false);
    const [userMenuOpened, setUserMenuOpened] = useState(false);
    const { user, loading, signOut } = useAuth();
    const [deleteModalOpened, { open: deleteModalOpen, close: deleteModalClose }] = useDisclosure(false);

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
        notifications.show({
            title: 'Success',
            message: "Account scheduled for deletion"
        });
    }

    return (
        <header className={classes.header}>
            <div className={classes.inner}>
                <Modal opened={deleteModalOpened} onClose={deleteModalClose} title="Delete Account">
                    <Stack>
                        <Text>Are you sure? You will not be able to login for 24 hours, and then your account will be deleted.</Text>
                        <Group justify='right'>
                            <Button onClick={deleteModalClose}>Go back</Button>
                            <Button onClick={deleteUserAccount}>Delete my account</Button>
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
                                Account settings
                            </Menu.Item>
                            <Menu.Item leftSection={<BsBoxArrowRight size={16} stroke={"1.5"} />} onClick={signOut}>Logout</Menu.Item>

                            <Menu.Divider />

                            <Menu.Label>Danger zone</Menu.Label>
                            <Menu.Item color="red" leftSection={<BsTrash size={16} stroke={"1.5"} />} onClick={deleteModalOpen}>
                                Delete account
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>}
                </Group>
            </div>
        </header>
    );
}