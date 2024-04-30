import { Button, Frog } from "frog";
import { devtools } from "frog/dev";
import { serveStatic } from "frog/serve-static";
import { neynar as neynarHub } from "frog/hubs";
import { neynar } from "frog/middlewares";
import { handle } from "frog/vercel";
import { CastParamType, NeynarAPIClient } from "@neynar/nodejs-sdk";
import { upthumb } from "../lib/upthumb.js";
import { Box, Heading, Text, VStack, vars } from "../lib/ui.js";
import redis from "../lib/redis.js";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY ?? "";
const neynarClient = new NeynarAPIClient(NEYNAR_API_KEY);

const ADD_URL =
  "https://warpcast.com/~/add-cast-action?url=https://upthumbs.app/api/upthumb";

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
app.hono.get("/upthumb", async (c) => {
  return c.json({
    name: "Upthumb",
    icon: "thumbsup",
    description: "Give casts 'upthumbs' and see them on a leaderboard.",
    aboutUrl: "https://github.com/horsefacts/upthumbs",
    action: {
      type: "post",
    },
  });
});

// Cast action POST handler
app.hono.post("/upthumb", async (c) => {
  const {
    trustedData: { messageBytes },
  } = await c.req.json();

  const result = await neynarClient.validateFrameAction(messageBytes);
  if (result.valid) {
    const cast = await neynarClient.lookUpCastByHashOrWarpcastUrl(
      result.action.cast.hash,
      CastParamType.Hash
    );
    const {
      cast: {
        author: { fid, username },
      },
    } = cast;
    if (result.action.interactor.fid === fid) {
      return c.json({ message: "Nice try." }, 400);
    }

    await upthumb(fid, username);

    let message = `You upthumbed ${username}`;
    if (message.length > 30) {
      message = "Upthumbed!";
    }

    return c.json({ message, link: "https://warpcast.com/horsefacts.eth/0x09d647a9" });
  } else {
    return c.json({ message: "Unauthorized" }, 401);
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
            Upthumbs 👍
          </Heading>
        </VStack>
      </Box>
    ),
    intents: [
      <Button.Link href={ADD_URL}>Add Action</Button.Link>,
      <Button value="leaderboard" action="/leaderboard">
        🏆 Leaderboard
      </Button>,
      <Button value="start" action="/upthumbs">
        👍 My Upthumbs
      </Button>,
    ],
  });
});

app.frame("/leaderboard", async (c) => {
  const leaders = await redis.zrevrange("upthumbs", 0, 3, "WITHSCORES");
  const [firstFid, firstScore, secondFid, secondScore, thirdFid, thirdScore] =
    leaders;

  const firstName = await redis.hget("usernames", firstFid);
  const secondName = await redis.hget("usernames", secondFid);
  const thirdName = await redis.hget("usernames", thirdFid);

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
            Leaderboard
          </Heading>
          <Box>
            <Text align="left" size="32">
              🥇 {firstName}: {firstScore}
            </Text>
            <Text align="left" size="32">
              🥈 {secondName}: {secondScore}
            </Text>
            <Text align="left" size="32">
              🥉 {thirdName}: {thirdScore}
            </Text>
          </Box>
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
