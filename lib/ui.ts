import { createSystem } from "frog/ui";

export const { Box, Heading, Text, VStack, vars } = createSystem({
  colors: {
    white: "white",
    black: "black",
    fcPurple: "rgb(138, 99, 210)"
  },
  fonts: {
    default: [
      {
        name: "Inter",
        source: "google",
        weight: 400,
      },
      {
        name: "Inter",
        source: "google",
        weight: 600,
      },
    ],
  },
});
