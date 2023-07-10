//Modules
import gptAvatar from "@/assets/gpt-avatar.svg";
import warning from "@/assets/warning.svg";
import user from "@/assets/user.png";
import { useRef, useState, useEffect } from "react";
import { useChat } from "@/store/chat";
import { useForm } from "react-hook-form";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { OpenAIApi, Configuration } from "openai";
import { useMutation } from "react-query";

//Components
import { Input } from "@/components/Input";
import { FiSend } from "react-icons/fi";
import { Avatar, IconButton, Spinner, Stack, Text } from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import { Instructions } from "../Layout/Instructions";
import { useAPI } from "@/store/api";

export interface ChatProps {}

export interface MessageProps {
  emitter: "gpt" | "user" | "error";
  key: number;
  message: string;
}

interface ChatSchema {
  input: string;
}

const getMessage = (message: string) => {
  if (message.slice(0, 2) == "\n\n") {
    return message.slice(2, Infinity);
  }

  return message;
};
const Message = ({ key, emitter, message }: MessageProps) => {
  const [displayMessage, setDisplayMessage] = useState('');

  useEffect(()=>{
    console.log('message changed');
    let tmpMessage = '';
    if(emitter === 'user'){
      setDisplayMessage(message);
      return;
    }
    const interval = setInterval(()=>{
      if(message !== tmpMessage){
        console.log('wow',displayMessage, displayMessage.length, message.slice(0,displayMessage.length + 1));
        setDisplayMessage(message.slice(0,tmpMessage.length + 1));
        tmpMessage = message.slice(0,tmpMessage.length + 1);
      }else{
        clearInterval(interval)
      }

    },30);
  },[message]);


  const getAvatar = () => {
    switch (emitter) {
      case "gpt":
        return gptAvatar;
      case "error":
        return warning;
      default:
        return user;
    }
  };

  return (
    <Stack
      key={key}
      direction="row"
      padding={4}
      rounded={8}
      backgroundColor={emitter == "gpt" ? "blackAlpha.200" : "transparent"}
      spacing={4}
    >
      <Avatar name={emitter} src={getAvatar()} />
      <Text
        whiteSpace="pre-wrap"
        marginTop=".75em !important"
        overflow="hidden"
      >
        <ReactMarkdown>{displayMessage}</ReactMarkdown>
      </Text>
    </Stack>
  );
};

const userMessages = ['wow thanks for that', 'this is the middle one', 'this is the first one'];
const typeUserMessage = (e: React.KeyboardEvent<HTMLInputElement>) => {
  const message = userMessages.pop();
  let displayMessage = '';
  if(!message) return;
  const target = e.currentTarget;
  const interval = setInterval(()=>{
    if(displayMessage === message){
      clearInterval(interval);
      return;
    }
    displayMessage = message.slice(0, displayMessage.length + 1);
    target.value = displayMessage;
  },30)
};

export const Chat = () => {
  const { api } = useAPI();
  const { selectedChat, addMessage, addChat } = useChat();
  const [ userInput, setUserInput ] = useState(true);
  const selectedId = selectedChat?.id;

  const hasSelectedChat = selectedChat && selectedChat?.content.length > 0;

  const { register, setValue, handleSubmit } = useForm<ChatSchema>();

  const overflowRef = useRef<HTMLDivElement>(null);
  const updateScroll = () => {
    overflowRef.current?.scrollTo(0, overflowRef.current.scrollHeight);
  };

  const [parentRef] = useAutoAnimate();

  const configuration = new Configuration({
    apiKey: api,
  });

  const openAi = new OpenAIApi(configuration);

  const { isLoading } = useMutation({
    mutationKey: "prompt",
    mutationFn: async (prompt: string) =>
      await openAi.createChatCompletion({
        model: "gpt-3.5-turbo",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
  });

  const handleAsk = async ({ input: prompt }: ChatSchema) => {
    updateScroll();
    const sendRequest = (selectedId: string) => {
      setValue("input", "");

      addMessage(selectedId, {
        emitter: "user",
        message: prompt,
      });

      setTimeout(() => {
        addMessage(selectedId, {
          emitter: "gpt",
          message: "This is a long message that chatgpt will respond with",
        });
        updateScroll();
        setTimeout(()=>{updateScroll()}, 50);
      }, 1000);
    };

    if (selectedId) {
      if (prompt && !isLoading) {
        sendRequest(selectedId);
      }
    } else {
      addChat(sendRequest);
    }
  };

  return (
    <Stack width="full" height="full">
      <Stack
        maxWidth="768px"
        width="full"
        marginX="auto"
        height="85%"
        overflow="auto"
        ref={overflowRef}
      >
        <Stack spacing={2} padding={2} ref={parentRef} height="full">
          {hasSelectedChat ? (
            selectedChat.content.map(({ emitter, message }, key) => {
              return (
                <Message message={getMessage(message)} key={key} emitter={emitter}></Message>
              );
            })
          ) : (
            <Instructions onClick={(text) => setValue("input", text)} />
          )}
        </Stack>
      </Stack>
      <Stack
        height="20%"
        padding={4}
        backgroundColor="blackAlpha.400"
        justifyContent="center"
        alignItems="center"
        overflow="hidden"
      >
        <Stack maxWidth="768px">
          <Input
            autoFocus={true}
            variant="filled"
            inputRightAddon={
              <IconButton
                aria-label="send_button"
                icon={!isLoading ? <FiSend /> : <Spinner />}
                backgroundColor="transparent"
                onClick={handleSubmit(handleAsk)}
              />
            }
            {...register("input")}
            onSubmit={console.log}
            onKeyDown={(e) => {
              if (e.key == "Enter") {
                if(userInput){
                  typeUserMessage(e);
                }else{
                  handleAsk({ input: e.currentTarget.value });
                }
                setUserInput(!userInput);
              }
            }}
          />
          <Text textAlign="center" fontSize="sm" opacity={0.5}>
            Free Research Preview. Our goal is to make AI systems more natural
            and safe to interact with. Your feedback will help us improve.
          </Text>
        </Stack>
      </Stack>
    </Stack>
  );
};

