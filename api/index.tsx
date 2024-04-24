import translate from "@vitalets/google-translate-api";
import { Button, Frog } from "frog";
import { devtools } from "frog/dev";
import { serveStatic } from "frog/serve-static";
import { neynar as neynarHub } from "frog/hubs";
import { neynar } from "frog/middlewares";
import { handle } from "frog/vercel";
import { CastParamType, NeynarAPIClient } from "@neynar/nodejs-sdk";
import { Box, Heading, Text, VStack, vars } from "../lib/ui.js";
import redis from "../lib/redis.js";



const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY ?? "";
const neynarClient = new NeynarAPIClient(NEYNAR_API_KEY);

const ADD_URL = "https://warpcast.com/~/add-cast-action?url=https://upthumbs.app/api/upthumb";

export const app = new Frog({
  assetsPath: "/",
  basePath: "/api",
  ui: { vars },
  hub: neynarHub({ apiKey: NEYNAR_API_KEY }),
  browserLocation: ADD_URL,
}).use(
  neynar({
    apiKey: NEYNAR_API_KEY,
    features: ["interactor", "cast"],
  })
);

// Cast action GET handler
app.hono.get("/translate", async (c) => {
  return c.json({
    name: "translate",
    icon: "cross-reference",
    description: "Automatic translate language and translate to chinese.",
    aboutUrl: "https://github.com/keyuyuan/translateAction",
    action: {
      type: "post",
    },
  });
});

// POST handler to detect input and translate to Chinese
app.hono.post("/translate", async (c) => {
  try {
    // Extract text from POST request
    const { text } = await c.req.json();

    // Translate text to Chinese
    const translatedText = await translate(text, { to: "zh-CN" });

    // Return translated text
    return c.json({ translatedText: translatedText.text });
  } catch (error) {
    console.error("Error handling translation request:", error);
    return c.json({ error: "An error occurred while translating text." }, 500);
  }
});

// Frame handlers
app.frame("/", (c) => {
  return c.res({
    image: (
      <Box
        grow
        alignVertical="center"
        backgroundColor="white"
        padding="32"
        border="1em solid rgb(138, 99, 210)"
      >
        <VStack gap="4">
          <Heading color="fcPurple" align="center" size="64">
            中文🀄️
          </Heading>
          <Text color="text200" size="20">
            warpcast的所有内容翻译成中文
          </Text>
        </VStack>
      </Box>
    ),
    intents: [
      <Button.Link href={ADD_URL}>Add Action</Button.Link>,
      <Button value="follow" action="/follow">
        关注作者
      </Button>,
      <Button value="translate" action="/translate">
        翻译
      </Button>,
    ],
  });
});

app.frame("/translate", async (c) => {
  return c.res({
    image: (
      <Box
        grow
        alignVertical="center"
        backgroundColor="white"
        padding="32"
        border="1em solid rgb(138, 99, 210)"
      >
        <VStack gap="4">
          <Heading color="fcPurple" align="center" size="48">
            翻译内容
          </Heading>
          <Text>{c.var.translatedText}</Text>
        </VStack>
      </Box>
    ),
    intents: [<Button.Reset>⬅️ Back</Button.Reset>],
  });
});

app.frame("/upthumbs", async (c) => {
  const fid = c.var.interactor?.fid ?? 0;
  let upthumbs = "0";
  try {
    upthumbs = (await redis.zscore("upthumbs", fid)) ?? "0";
  } catch (e) {}

  return c.res({
    image: (
      <Box
        grow
        alignVertical="center"
        backgroundColor="white"
        padding="32"
        border="1em solid rgb(138, 99, 210)"
      >
        <VStack gap="4">
          <Heading color="fcPurple" align="center" size="48">
            Your Upthumbs:
          </Heading>
          <Text align="center" size="32">
            {upthumbs}
          </Text>
        </VStack>
      </Box>
    ),
    intents: [<Button.Reset>⬅️ Back</Button.Reset>],
  });
});

// @ts-ignore
const isEdgeFunction = typeof EdgeFunction !== "undefined";
const isProduction = isEdgeFunction || import.meta.env?.MODE !== "development";
devtools(app, isProduction ? { assetsPath: "/.frog" } : { serveStatic });

export const GET = handle(app);
export const POST = handle(app);
