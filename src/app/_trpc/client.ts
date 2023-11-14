import { createTRPCReact } from "@trpc/react-query";
import { AppRouter } from "~/trcp";

export const trpc = createTRPCReact<AppRouter>({});
