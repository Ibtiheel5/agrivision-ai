import { beforeEach, expect, test } from "vitest";
import {
  clearConversations, getConversation, listConversations, newId,
  removeConversation, saveConversation, titleOf,
} from "./conversations";

beforeEach(() => localStorage.clear());

test("enregistre, relit et classe par date de mise à jour", () => {
  saveConversation({ id: "a", messages: [{ role: "user", content: "première" }] });
  saveConversation({ id: "b", messages: [{ role: "user", content: "deuxième" }] });
  const all = listConversations();
  expect(all.map((c) => c.id)).toEqual(["b", "a"]);
  expect(getConversation("a").title).toBe("première");
});

test("l'audio n'est pas persisté", () => {
  saveConversation({
    id: "a",
    messages: [{ role: "assistant", content: "ahla", audioUrl: "data:audio/wav;base64,AAAA" }],
  });
  const saved = getConversation("a").messages[0];
  expect(saved.content).toBe("ahla");
  expect(saved.audioUrl).toBeUndefined();
});

test("une mise à jour garde la date de création et ne duplique pas", () => {
  const first = saveConversation({ id: "a", messages: [{ role: "user", content: "x" }] });
  const second = saveConversation({ id: "a", messages: [{ role: "user", content: "x" }, { role: "assistant", content: "y" }] });
  expect(second.createdAt).toBe(first.createdAt);
  expect(listConversations()).toHaveLength(1);
  expect(getConversation("a").messages).toHaveLength(2);
});

test("une conversation vide n'est pas enregistrée", () => {
  expect(saveConversation({ id: "a", messages: [] })).toBeNull();
  expect(listConversations()).toHaveLength(0);
});

test("titre d'une conversation ouverte par une analyse", () => {
  expect(titleOf([{ role: "analysis", analysis: { label: "Mildiou de la tomate" } }])).toBe("Mildiou de la tomate");
  expect(titleOf([{ role: "user", content: "a".repeat(60) }])).toHaveLength(49); // 48 + ellipse
});

test("suppression unitaire et globale", () => {
  saveConversation({ id: "a", messages: [{ role: "user", content: "x" }] });
  saveConversation({ id: "b", messages: [{ role: "user", content: "y" }] });
  removeConversation("a");
  expect(listConversations().map((c) => c.id)).toEqual(["b"]);
  clearConversations();
  expect(listConversations()).toHaveLength(0);
});

test("ne garde que les 20 dernières conversations", () => {
  for (let i = 0; i < 25; i++) saveConversation({ id: `c${i}`, messages: [{ role: "user", content: `m${i}` }] });
  expect(listConversations()).toHaveLength(20);
  expect(getConversation("c24")).not.toBeNull();
  expect(getConversation("c0")).toBeNull();
});

test("localStorage corrompu : liste vide au lieu d'une erreur", () => {
  localStorage.setItem("agrivision.chats.v1", "{pas du json");
  expect(listConversations()).toEqual([]);
});

test("identifiants uniques", () => {
  expect(newId()).not.toBe(newId());
});
