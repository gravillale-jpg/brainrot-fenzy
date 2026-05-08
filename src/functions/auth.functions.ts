import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const signInSchema = z.object({ nickname: z.string().min(1).max(20) });

export const signInOrUp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => signInSchema.parse(d))
  .handler(async ({ data }) => {
    const { doSignInOrUp } = await import("@/server/auth-impl.server");
    return doSignInOrUp(data.nickname.trim());
  });
