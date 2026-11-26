// Conversations de l'assistant, dans le stockage durable (plus de limite de quota localStorage).
// L'audio n'est jamais enregistré : il est volumineux et se regénère à la demande.
import { all, clear, get, put, remove } from "./store";

const MAX_MESSAGES = 120;

export const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const listConversations = () => all("chats");
export const getConversation = (id) => get("chats", id);

/** Titre lisible : la première chose que l'utilisateur a dite ou photographiée. */
export function titleOf(messages) {
  const first = messages.find((m) => m.role === "user" || m.role === "analysis");
  if (!first) return "Nouvelle conversation";
  const text = first.role === "analysis" ? first.analysis?.label ?? "Analyse" : first.content;
  return text.length > 48 ? `${text.slice(0, 48)}…` : text;
}

const strip = (messages) =>
  messages.slice(-MAX_MESSAGES).map(({ audioUrl, ...rest }) => rest); // eslint-disable-line no-unused-vars

/** Crée ou met à jour une conversation. Une conversation vide n'est pas enregistrée. */
export function saveConversation({ id, messages }) {
  if (!messages.length) return null;
  const previous = get("chats", id);
  const entry = {
    id,
    title: titleOf(messages),
    createdAt: previous?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    messages: strip(messages),
  };
  put("chats", entry);
  return entry;
}

export const removeConversation = (id) => remove("chats", id);
export const clearConversations = () => clear("chats");
