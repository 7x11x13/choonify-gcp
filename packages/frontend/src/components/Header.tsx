import {
  Burger,
  Group,
  Image,
  NavLink,
  Skeleton,
  Stack,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import React from "react";
import { preload } from "react-dom";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useAuth } from "./Auth";
import classes from "./Header.module.css";

// split this to reduce bundle size
const HeaderLoggedIn = React.lazy(() => import("./HeaderLoggedIn.tsx"));

export default function Header() {
  const [opened, { toggle }] = useDisclosure(false);
  const { user, loading, signIn } = useAuth();
  const { t, i18n } = useTranslation();

  const links = [
    {
      link: "/",
      label: t("header.label.home"),
      preloadTsx: [],
      preloadHrefs: [],
    },
    {
      link: "/support",
      label: t("header.label.support"),
      preloadTsx: ["Readme"],
      preloadHrefs: [`/locales/${i18n.language}/support.json5`],
    },
    {
      link: "/documentation",
      label: t("header.label.docs"),
      preloadTsx: ["Readme"],
      preloadHrefs: [`/locales/${i18n.language}/documentation.json5`],
    },
    {
      link: "/pricing",
      label: t("header.label.pricing"),
      preloadTsx: ["Pricing"],
      preloadHrefs: [],
    },
  ];

  const items = links.map((link) => (
    <Link
      key={link.label}
      to={link.link}
      className={classes.link}
      onMouseOver={() => {
        for (const path of link.preloadTsx) {
          import(`../containers/${path}.tsx`);
        }
        for (const href of link.preloadHrefs) {
          preload(href, { as: "fetch", crossOrigin: "anonymous" });
        }
      }}
    >
      {link.label}
    </Link>
  ));

  const burgerItems = links.map((link) => (
    <NavLink
      key={link.label}
      label={link.label}
      component={Link}
      to={link.link}
      onClick={toggle}
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
          <Group justify="center">
            <Burger
              opened={opened}
              onClick={toggle}
              size="sm"
              hiddenFrom="sm"
              aria-label="Menu"
            />
            <Link
              to="/"
              style={{
                textDecoration: "none",
                color: "#282828",
              }}
            >
              <Group gap="xs">
                <Image src="/logo.webp" alt="Logo" h="36px" w="36px" />
                <Title>Choonify</Title>
              </Group>
            </Link>
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
