import { ReactNode, createContext, useRef, useState } from "react";
import { useToast } from "../ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "~/app/_trpc/client";
import { INFINITE_QUERY_LIMIT } from "~/config/infinite-query";

type StreamResponse = {
    addMessage: () => void;
    message: string;
    handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    isLoading: boolean;
};

export const ChatContext = createContext<StreamResponse>({
    addMessage: () => {},
    message: "",
    handleInputChange: () => {},
    isLoading: false,
});

type Props = {
    fileId: string;
    children: ReactNode;
};

export const ChatContextProvider = ({ fileId, children }: Props) => {
    const [message, setMessage] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const { toast } = useToast();

    const utils = trpc.useContext();

    const backupMessage = useRef("");

    const { mutate: sendMessage } = useMutation({
        mutationFn: async ({ message }: { message: string }) => {
            const response = await fetch("/api/message", {
                method: "POST",
                body: JSON.stringify({
                    fileId,
                    message,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to send message");
            }

            return response.body;
        },
        onMutate: async ({ message }) => {
            backupMessage.current = message;
            setMessage("");

            await utils.getFIleMessages.cancel();

            const prevMessages = utils.getFIleMessages.getInfiniteData();

            utils.getFIleMessages.setInfiniteData(
                {
                    fileId,
                    limit: INFINITE_QUERY_LIMIT,
                },
                (old) => {
                    if (!old) {
                        return {
                            pages: [],
                            pageParams: [],
                        };
                    }

                    let newPage = [...old.pages];
                    let latestPage = newPage[0]!;

                    latestPage.messages = [
                        {
                            createdAt: new Date().toISOString(),
                            id: crypto.randomUUID(),
                            text: message,
                            isUserMessage: true,
                        },
                        ...latestPage.messages,
                    ];

                    newPage[0] = latestPage;

                    return {
                        ...old,
                        pages: newPage,
                    };
                }
            );

            setIsLoading(true);

            return {
                previousMessages: prevMessages?.pages.flatMap((page) => page.messages) ?? [],
            };
        },
        onError: (_, __, Context) => {
            setMessage(backupMessage.current);
            utils.getFIleMessages.setData({ fileId }, { messages: Context?.previousMessages ?? [] });
        },

        onSuccess: async (stream) => {
            setIsLoading(false);

            if (!stream) {
                return toast({
                    title: "There was a problem sending this message",
                    description: "Please refresh this page and try again",
                    variant: "destructive",
                });
            }

            const reader = stream.getReader();
            const decoder = new TextDecoder();
            let done = false;

            let accResponse = "";
            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;

                const chunkValue = decoder.decode(value);

                accResponse += chunkValue;

                utils.getFIleMessages.setInfiniteData(
                    {
                        fileId,
                        limit: INFINITE_QUERY_LIMIT,
                    },
                    (old) => {
                        if (!old) return { pages: [], pageParams: [] };

                        let isAiResponseCreated = old.pages.some((page) =>
                            page.messages.some((message) => message.id === "ai-response")
                        );

                        let updatedPages = old.pages.map((page) => {
                            if (page === old.pages[0]) {
                                let updatedMessages;

                                if (!isAiResponseCreated) {
                                    updatedMessages = [
                                        {
                                            createdAt: new Date().toISOString(),
                                            id: "ai-response",
                                            text: accResponse,
                                            isUserMessage: false,
                                        },
                                        ...page.messages,
                                    ];
                                } else {
                                    updatedMessages = page.messages.map((message) => {
                                        if (message.id === "ai-response") {
                                            return {
                                                ...message,
                                                text: accResponse,
                                            };
                                        }
                                        return message;
                                    });
                                }

                                return {
                                    ...page,
                                    messages: updatedMessages,
                                };
                            }

                            return page;
                        });

                        return { ...old, pages: updatedPages };
                    }
                );
            }
        },

        onSettled: async () => {
            setIsLoading(false);
            await utils.getFIleMessages.invalidate({ fileId });
        },
    });

    const addMessage = () => {
        sendMessage({ message });
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(event.target.value);
    };

    return (
        <ChatContext.Provider
            value={{
                addMessage,
                message,
                handleInputChange,
                isLoading,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};
