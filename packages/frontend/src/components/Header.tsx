import { Burger, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';
import { useAuth } from './Auth';
import GoogleLoginButton from './GoogleLoginButton';
import classes from './Header.module.css';
import React from 'react';

// split this to reduce bundle size
const HeaderLoggedIn = React.lazy(() => import("./HeaderLoggedIn.tsx"))

export function Header() {
    const [opened, { toggle }] = useDisclosure(false);
    const { user, loading } = useAuth();
    const { t } = useTranslation();

    const links = [
        { link: '/pricing', label: t('header.label.pricing') },
    ];

    const items = links.map((link) => (
        <Link to={link.link} className={classes.link}>{link.label}</Link>
    ));

    if (loading) {
        return;
    }

    return (
        <header className={classes.header}>
            <div className={classes.inner}>
                <Group>
                    <Burger opened={opened} onClick={toggle} size="sm" hiddenFrom="sm" /> {/* TODO */}
                    <h1><Link to="/" style={{ textDecoration: 'none', color: 'black' }}>Choonify</Link></h1>
                </Group>
                <Group>
                    <Group ml={50} gap={5} className={classes.links} visibleFrom="sm">
                        {items}
                    </Group>
                    {!user && <GoogleLoginButton></GoogleLoginButton>}
                    {user && <HeaderLoggedIn></HeaderLoggedIn>}
                </Group>
            </div>
        </header>
    );
}