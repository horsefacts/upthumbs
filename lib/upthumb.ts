import redis from "./redis.js";

export async function upthumb(fid: number, username: string) {
  const id = fid.toString();
  await redis.zincrby("upthumbs", 1, id);
  await redis.hset("usernames", id, username);
}
