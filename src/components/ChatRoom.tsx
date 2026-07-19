"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { apiFetch } from "@/lib/http";
import type { Character, Message } from "@/lib/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export default function ChatRoom({
  character,
  initialConversationId,
  initialMessages,
}: {
  character: Character;
  initialConversationId: string | null;
  initialMessages: Message[];
}) {
  const seed: ChatMessage[] =
    initialMessages.length > 0
      ? initialMessages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }))
      : character.greeting
      ? [{ id: "greeting", role: "assistant", content: character.greeting }]
      : [];

  const [messages, setMessages] = useState<ChatMessage[]>(seed);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    setError(null);
    setInput("");
    requestAnimationFrame(autoGrow);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    const assistantId = `a-${Date.now()}`;
    setMessages((m) => [
      ...m,
      userMsg,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);
    setSending(true);

    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          conversationId,
          message: text,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(await res.text().catch(() => "Request failed"));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const chunk of events) {
          const evLine = chunk.match(/^event: (.+)$/m)?.[1];
          const dataLine = chunk.match(/^data: (.+)$/m)?.[1];
          if (!evLine || !dataLine) continue;
          const data = JSON.parse(dataLine);

          if (evLine === "meta" && data.conversationId) {
            setConversationId(data.conversationId);
          } else if (evLine === "delta") {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: msg.content + data.text }
                  : msg
              )
            );
          } else if (evLine === "error") {
            setError(data.message);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId ? { ...msg, streaming: false } : msg
        )
      );
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex h-screen flex-col bg-bg">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-line/70 bg-bg/80 px-4 py-3 backdrop-blur-xl">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-bg-hover hover:text-white"
          aria-label="Back"
        >
          ←
        </Link>
        <Avatar
          emoji={character.avatarEmoji}
          color={character.avatarColor}
          imageUrl={character.avatarImage}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold leading-tight">
            {character.name}
          </h1>
          <p className="truncate text-xs text-muted">
            {character.tagline || `by ${character.creatorName}`}
          </p>
        </div>
        <a
          href={`/chat/${character.id}?new=1`}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-bg-hover hover:text-white"
          title="Start a new chat"
        >
          ＋ New
        </a>
        <Link
          href={`/character/${character.id}`}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-bg-hover hover:text-white"
        >
          Details
        </Link>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
          <IntroCard character={character} />
          {messages.map((m) => (
            <Bubble key={m.id} message={m} character={character} />
          ))}
          {error && (
            <div className="mx-auto rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-line/70 bg-bg/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoGrow();
            }}
            onKeyDown={onKeyDown}
            placeholder={`Message ${character.name}…`}
            className="input max-h-40 resize-none py-3"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="btn-primary h-[46px] w-[46px] shrink-0 !px-0"
            aria-label="Send"
          >
            {sending ? (
              <span className="flex gap-1">
                <Dot /> <Dot /> <Dot />
              </span>
            ) : (
              <span className="text-lg leading-none">↑</span>
            )}
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted/70">
          {character.name} is an AI character. Messages may be inaccurate — keep
          it kind.
        </p>
      </div>
    </div>
  );
}

function Bubble({
  message,
  character,
}: {
  message: ChatMessage;
  character: Character;
}) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex animate-fade-in gap-3 ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      {!isUser && (
        <Avatar
          emoji={character.avatarEmoji}
          color={character.avatarColor}
          imageUrl={character.avatarImage}
          size={34}
          className="mt-0.5"
        />
      )}
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
          isUser
            ? "rounded-br-md bg-brand text-white"
            : "rounded-bl-md border border-line bg-bg-card text-white"
        }`}
      >
        {message.content}
        {message.streaming && message.content === "" && (
          <span className="inline-flex gap-1 py-1">
            <Dot /> <Dot /> <Dot />
          </span>
        )}
        {message.streaming && message.content !== "" && (
          <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse-dot bg-brand-soft" />
        )}
      </div>
    </div>
  );
}

function IntroCard({ character }: { character: Character }) {
  return (
    <div className="mb-2 flex flex-col items-center gap-2 py-4 text-center">
      <Avatar
        emoji={character.avatarEmoji}
        color={character.avatarColor}
        imageUrl={character.avatarImage}
        size={72}
      />
      <h2 className="text-lg font-bold">{character.name}</h2>
      {character.description && (
        <p className="max-w-md text-sm text-muted">{character.description}</p>
      )}
    </div>
  );
}

function Dot() {
  return (
    <span className="inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current" />
  );
}
