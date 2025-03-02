import {
  Button,
  Center,
  Group,
  List,
  Paper,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import cx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../components/Auth";

import config from "../config";
import { apiPost } from "../util/api";
import classes from "./Pricing.module.css";
import Loading from "../components/Loading";

type SubscriptionTierInfo = {
  name: string;
  priceMonthlyUSD: number;
  priceYearlyUSD: number;
  marketingFeatures: React.ReactNode[];
  footnote: string;
};

export default function Pricing() {
  const { t } = useTranslation();
  const { user, loading, userInfo, signIn } = useAuth();
  const [pricingInterval, setPricingInterval] = useState("monthly");
  const [portalSessionURL, setPortalSessionURL] = useState("");

  useEffect(() => {
    if (user) {
      createPortalSession();
    }
  }, [user]);

  async function createPortalSession() {
    const url = await apiPost("/create-customer-portal-session", {
      returnUrl: config.api.LOCAL
        ? "http://localhost:3000/pricing"
        : "https://choonify-dev.web.app/pricing", // TODO: set based on config
    });
    setPortalSessionURL(url ?? "");
  }

  function togglePricingInterval() {
    if (pricingInterval === "monthly") {
      setPricingInterval("yearly");
    } else {
      setPricingInterval("monthly");
    }
  }

  function openPortalSession() {
    window.location.href = portalSessionURL;
  }

  if (loading) {
    return <Loading />;
  }

  const freeFeatures = [
    t("product.features.batch-upload"),
    t("product.features.no-transcoding"),
    t("product.features.read-metadata-tags"),
  ];

  const paidFeatures = [
    ...freeFeatures,
    t("product.features.no-watermark"),
    t("product.features.no-ads"),
    t("product.features.link-multiple-channels"),
    t("product.features.more-video-filters"),
  ];

  const tiers: SubscriptionTierInfo[] = [
    {
      name: "Free",
      priceMonthlyUSD: 0,
      priceYearlyUSD: 0,
      marketingFeatures: [
        t("product.features.upload-quota", { quota: t("product.tier0.quota") }),
        ...freeFeatures,
      ],
      footnote: t("product.tier0.footnote"),
    },
    {
      name: "Basic",
      priceMonthlyUSD: 5.99,
      priceYearlyUSD: 59.99,
      marketingFeatures: [
        t("product.features.upload-quota", { quota: t("product.tier1.quota") }),
        ...paidFeatures,
      ],
      footnote: t("product.tier1.footnote"),
    },
    {
      name: "Plus",
      priceMonthlyUSD: 11.99,
      priceYearlyUSD: 119.99,
      marketingFeatures: [
        t("product.features.upload-quota", { quota: t("product.tier2.quota") }),
        ...paidFeatures,
      ],
      footnote: t("product.tier2.footnote"),
    },
    {
      name: "Premium",
      priceMonthlyUSD: 23.99,
      priceYearlyUSD: 239.99,
      marketingFeatures: [
        t("product.features.upload-quota", { quota: t("product.tier3.quota") }),
        ...paidFeatures,
      ],
      footnote: t("product.tier3.footnote"),
    },
  ];

  const cards = tiers.map((tier, idx) => {
    const monthlyPrice =
      pricingInterval === "monthly"
        ? tier.priceMonthlyUSD
        : Math.trunc((tier.priceYearlyUSD / 12) * 100) / 100;
    const yearlyPrice =
      pricingInterval === "monthly"
        ? tier.priceMonthlyUSD * 12
        : tier.priceYearlyUSD;
    const features = tier.marketingFeatures.map((feature) => (
      <List.Item>{feature}</List.Item>
    ));
    const selected = userInfo?.subscription === idx;

    return (
      <Stack gap="0">
        <Paper
          shadow="md"
          w="300px"
          h="500px"
          withBorder
          className={cx(classes.product, {
            [classes.productSelected]: selected,
          })}
        >
          <Stack h="100%">
            <Title order={3}>{tier.name}</Title>
            <Stack gap="0">
              <Title order={1}>${monthlyPrice}</Title>
              <Text>{t("product.pricing.per-month")}</Text>
              <Text size="xs" c="dimmed">
                (${yearlyPrice} {t("product.pricing.per-year")})
              </Text>
            </Stack>
            <Title order={5}>{t("header.label.features")}</Title>
            <List ta="left" mx="md">
              {...features}
            </List>
            <Text mx="sm" mt="auto" mb="0" ta="left" size="xs" c="dimmed">
              {tier.footnote}
            </Text>
            {user && !selected && (
              <Button
                mt="0"
                disabled={portalSessionURL === ""}
                onClick={openPortalSession}
              >
                {portalSessionURL === ""
                  ? t("loading")
                  : t("product.button.change-plan")}
              </Button>
            )}
            {user && selected && (
              <Button mt="0" disabled>
                {t("product.button.current-plan")}
              </Button>
            )}
            {!user && (
              <Button mt="0" onClick={signIn}>
                {t("product.button.get-started")}
              </Button>
            )}
          </Stack>
        </Paper>
        {/* <Text className={classes.currentPlanText} c="primary" style={!selected ? { visibility: "hidden" } : {}}>Current plan</Text> */}
      </Stack>
    );
  });

  return (
    <Center>
      <Stack justify="center" ta="center" align="center">
        <Title order={1}>{t("header.label.pricing")}</Title>
        <Group gap="xs" justify="center" ta="center" align="center">
          <Text size="sm">{t("product.pricing.monthly")}</Text>
          <Switch
            checked={pricingInterval === "yearly"}
            onChange={togglePricingInterval}
            size="md"
          />
          <Text size="sm">{t("product.pricing.yearly")}</Text>
        </Group>
        <Group justify="center" ta="center" align="center">
          {...cards}
        </Group>
      </Stack>
    </Center>
  );
}
