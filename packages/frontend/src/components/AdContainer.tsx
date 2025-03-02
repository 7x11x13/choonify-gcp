import { Center, Paper } from "@mantine/core";

export default function AdContainer({ ...props }) {
  return (
    <Paper {...props} withBorder style={{ flexGrow: 0 }}>
      <Center w="100%" h="100%">
        Ad placeholder
      </Center>
    </Paper>
  );
}
