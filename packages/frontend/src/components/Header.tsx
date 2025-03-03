import { Burger, Group, NavLink, Skeleton, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useAuth } from "./Auth";
import classes from "./Header.module.css";

// split this to reduce bundle size
const HeaderLoggedIn = React.lazy(() => import("./HeaderLoggedIn.tsx"));

export function Header() {
  const [opened, { toggle }] = useDisclosure(false);
  const { user, loading, signIn } = useAuth();
  const { t } = useTranslation();

  const links = [
    { link: "/support", label: t("header.label.support") },
    { link: "/documentation", label: t("header.label.docs") },
    { link: "/pricing", label: t("header.label.pricing") },
  ];

  const items = links.map((link) => (
    <Link key={link.label} to={link.link} className={classes.link}>
      {link.label}
    </Link>
  ));

  const burgerItems = links.map((link) => (
    <NavLink
      key={link.label}
      label={link.label}
      component={Link}
      to={link.link}
    />
  ));

  if (!user && !loading) {
    items.push(
      <Link key={"login"} to="" onClick={signIn} className={classes.link}>
        {t("login_button.login")}
      </Link>,
    );
  }

  return (
    <header className={classes.header}>
      <Stack gap="0">
        <div className={classes.inner}>
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              size="sm"
              hiddenFrom="sm"
              aria-label="Menu"
            />
            <Title>
              <Link to="/" style={{ textDecoration: "none", color: "black" }}>
                Choonify
              </Link>
            </Title>
          </Group>
          <Group>
            <Group ml={50} gap={5} className={classes.links} visibleFrom="sm">
              {items}
            </Group>
            {!user && loading && (
              <Skeleton height="32px" width="32px" radius="xl" mr="17px" />
            )}
            {user && <HeaderLoggedIn></HeaderLoggedIn>}
          </Group>
        </div>
        {opened && (
          <Stack gap="0" hiddenFrom="sm">
            {burgerItems}
          </Stack>
        )}
      </Stack>
    </header>
  );
}
