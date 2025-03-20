import { Paper, PaperProps } from "@mantine/core";
import config from "../config";

export default function AdContainer({
  name,
  ...props
}: {
  name: keyof typeof config.ads.UNITS;
} & PaperProps) {
  return (
    <>
      <Paper {...props} withBorder style={{ flexGrow: 0 }}>
        <ins
          className="adsbygoogle"
          style={{ display: "inline-block", width: "100%", height: "100%" }}
          data-ad-client={config.ads.CLIENT_ID}
          data-ad-slot={config.ads.UNITS[name]}
        ></ins>
      </Paper>
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    </>
  );
}
