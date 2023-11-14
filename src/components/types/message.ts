import { inferRouterOutputs } from "@trpc/server";
import { AppRouter } from "~/trcp";

type RouterOutput = inferRouterOutputs<AppRouter>;

type Messages = RouterOutput["getFIleMessages"]["messages"];

type OmitText = Omit<Messages[number], "text">;

type ExtendedText = {
    text: string | JSX.Element;
};

export type ExtendedMessage = OmitText & ExtendedText;
