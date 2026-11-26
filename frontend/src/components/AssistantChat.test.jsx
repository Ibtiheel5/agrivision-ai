import "fake-indexeddb/auto";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../LangContext", () => ({ useLang: () => ({ lang: "derja", t: (k) => k }) }));
vi.mock("../lib/assistant", async () => {
  const real = await vi.importActual("../lib/assistant");
  return {
    ...real,
    sendChat: vi.fn(async () => "جاوبتك"),
    sendVoice: vi.fn(),
    fetchTts: vi.fn(async () => "data:audio/wav;base64,AAA"),
  };
});
// Le stockage est réel (fake-indexeddb) ; seule la génération de miniature est simulée,
// car createImageBitmap et canvas n'existent pas dans jsdom.
vi.mock("../services/history", async () => ({
  ...(await vi.importActual("../services/history")),
  thumbnail: vi.fn(async () => "data:image/jpeg;base64,THUMB"),
}));
vi.mock("../services/api", () => ({
  compressImage: vi.fn(async (f) => f),
  errorMessage: (e) => e.message ?? "erreur",
  predict: vi.fn(async () => ({ data: { detections: [{ label: "tomato_leaf_late_blight", confidence: 0.83 }] } })),
}));

import { sendChat } from "../lib/assistant";
import { predict } from "../services/api";
import { loadHistory } from "../services/history";
import { __reset, initStore } from "../services/store";
import { getConversation, listConversations } from "../services/conversations";
import AssistantChat from "./AssistantChat";

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.Audio = class { play() { return Promise.resolve(); } pause() {} };
});
beforeEach(async () => {
  localStorage.clear();
  vi.clearAllMocks();
  __reset();
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase("agrivision");
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
  await initStore(); // vrai stockage durable, comme dans l'application
});

const pickFile = () => new File([new Uint8Array([1, 2, 3])], "feuille.jpg", { type: "image/jpeg" });

/** Ouvre le choix de source et dépose un fichier via l'entrée demandée. */
const envoyerPhoto = (container, source = "galerie") => {
  fireEvent.click(screen.getByTitle(/Zid taswira|Ajouter une photo/));
  const inputs = container.querySelectorAll(".asst-hidden");
  const input = source === "camera" ? inputs[0] : inputs[1];
  fireEvent.change(input, { target: { files: [pickFile()] } });
};

test("photo : analyse, bulle résultat, historique et conseil automatique", async () => {
  const { container } = render(<AssistantChat conversationId="c1" />);
  envoyerPhoto(container);

  await waitFor(() => expect(predict).toHaveBeenCalled());
  // le libellé apparaît deux fois : bandeau de diagnostic + bulle d'analyse
  expect(await screen.findAllByText("Mildiou de la tomate")).toHaveLength(2);  // nom français
  await waitFor(() => expect(sendChat).toHaveBeenCalled());    // conseil demandé tout seul

  const [, , diagnosis] = sendChat.mock.calls[0];
  expect(diagnosis).toEqual({ label: "tomato_leaf_late_blight", confidence: 0.83, status: null });
  expect(loadHistory()[0].top).toBe("tomato_leaf_late_blight"); // visible dans l'Historique de l'app
  await screen.findByText("جاوبتك");
});

test("photo sans détection : pas de diagnostic, question adaptée", async () => {
  predict.mockResolvedValueOnce({ data: { detections: [] } });
  const { container } = render(<AssistantChat conversationId="c2" />);
  envoyerPhoto(container, "camera");

  await waitFor(() => expect(sendChat).toHaveBeenCalled());
  const [question, , diagnosis] = sendChat.mock.calls[0];
  expect(diagnosis).toBeNull();
  expect(question).toMatch(/ma l9at chay/i);
});

test("les analyses passées sont envoyées au modèle", async () => {
  const { container } = render(<AssistantChat conversationId="c3" />);
  envoyerPhoto(container);
  await waitFor(() => expect(sendChat).toHaveBeenCalled());

  const analyses = sendChat.mock.calls[0][4];
  expect(analyses[0].label).toBe("tomato_leaf_late_blight");
  expect(analyses[0].confidence).toBe(0.83);
  expect(analyses[0].when).toBeTruthy();
});

test("la conversation est enregistrée, sans l'audio", async () => {
  render(<AssistantChat conversationId="c4" />);
  const box = screen.getByPlaceholderText("Akteb so2elek…");
  fireEvent.change(box, { target: { value: "3andi mochkla" } });
  fireEvent.submit(box.closest("form"));

  await waitFor(() => expect(getConversation("c4")?.messages).toHaveLength(2));
  const saved = getConversation("c4");
  expect(saved.title).toBe("3andi mochkla");
  expect(saved.messages.every((m) => m.audioUrl === undefined)).toBe(true);
  expect(listConversations()).toHaveLength(1);
});

test("une conversation reprise réaffiche ses messages et continue dedans", async () => {
  render(
    <AssistantChat
      conversationId="c5"
      initialMessages={[{ role: "user", content: "message d'avant" }, { role: "assistant", content: "réponse d'avant" }]}
    />,
  );
  expect(screen.getByText("message d'avant")).toBeTruthy();

  const box = screen.getByPlaceholderText("Akteb so2elek…");
  fireEvent.change(box, { target: { value: "suite" } });
  fireEvent.submit(box.closest("form"));
  await waitFor(() => expect(sendChat).toHaveBeenCalled());

  const historyEnvoye = sendChat.mock.calls[0][1];
  expect(historyEnvoye.map((m) => m.content)).toEqual(["message d'avant", "réponse d'avant"]);
});

test("autoExplain ne se déclenche pas sur une conversation reprise", async () => {
  render(
    <AssistantChat
      conversationId="c6"
      autoExplain
      entry={{ label: "Corn_Rust", confidence: 0.9 }}
      initialMessages={[{ role: "user", content: "déjà là" }]}
    />,
  );
  await new Promise((r) => setTimeout(r, 50));
  expect(sendChat).not.toHaveBeenCalled();
});


test("aucune emoji : les boutons sont des icônes SVG", () => {
  const { container } = render(<AssistantChat conversationId="c7" />);
  const html = container.innerHTML;
  expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(3); // photo, micro, envoi
  expect(screen.getByTitle("Zid taswira")).toBeTruthy();
  expect(screen.getByTitle("E7ki")).toBeTruthy();
  expect(screen.getByTitle("Ab3ath")).toBeTruthy();
});


test("le bouton photo propose appareil photo et galerie", () => {
  const { container } = render(<AssistantChat conversationId="c8" />);
  expect(container.querySelector(".asst-picker")).toBeNull();

  fireEvent.click(screen.getByTitle("Zid taswira"));
  expect(screen.getByText("Sawwer taswira")).toBeTruthy();
  expect(screen.getByText("5tar mel galerie")).toBeTruthy();

  const inputs = container.querySelectorAll(".asst-hidden");
  expect(inputs[0].getAttribute("capture")).toBe("environment"); // appareil photo
  expect(inputs[1].hasAttribute("capture")).toBe(false);         // galerie

  fireEvent.click(screen.getByText("Bla"));
  expect(container.querySelector(".asst-picker")).toBeNull();
});
