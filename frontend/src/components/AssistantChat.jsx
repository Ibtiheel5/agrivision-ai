import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { useLang } from "../LangContext";
import { fetchTts, hasArabic, pickMimeType, sendChat, sendVoice, toAnalyses } from "../lib/assistant";
import { compressImage, errorMessage, predict } from "../services/api";
import { addHistory, loadHistory, thumbnail } from "../services/history";
import { newId, saveConversation } from "../services/conversations";
import { reportDetection } from "../services/risk";
import "./assistant.css";

const MAX_RECORD_MS = 30000; // le serveur travaille sur CPU : enregistrements courts

// Noms français des classes du modèle (le composant reste autonome : aucun import de librairie locale).
const LABELS_FR = {
  "apple scab leaf": "Tavelure du pommier",
  "apple leaf": "Feuille de pommier saine",
  "apple rust leaf": "Rouille du pommier",
  "bell pepper leaf spot": "Tache foliaire du poivron",
  "bell pepper leaf": "Feuille de poivron saine",
  "blueberry leaf": "Feuille de myrtillier saine",
  "cherry leaf": "Feuille de cerisier saine",
  "corn gray leaf spot": "Tache grise du maïs",
  "corn leaf blight": "Brûlure foliaire du maïs",
  "corn rust leaf": "Rouille du maïs",
  "peach leaf": "Feuille de pêcher saine",
  "potato leaf early blight": "Alternariose de la pomme de terre",
  "potato leaf late blight": "Mildiou de la pomme de terre",
  "potato leaf": "Feuille de pomme de terre saine",
  "raspberry leaf": "Feuille de framboisier saine",
  "soybean leaf": "Feuille de soja saine",
  "squash powdery mildew leaf": "Oïdium de la courge",
  "strawberry leaf": "Feuille de fraisier saine",
  "tomato early blight leaf": "Alternariose de la tomate",
  "tomato septoria leaf spot": "Septoriose de la tomate",
  "tomato leaf bacterial spot": "Tache bactérienne de la tomate",
  "tomato leaf late blight": "Mildiou de la tomate",
  "tomato leaf mosaic virus": "Mosaïque de la tomate",
  "tomato leaf yellow virus": "Jaunisse de la tomate",
  "tomato leaf": "Feuille de tomate saine",
  "tomato mold leaf": "Moisissure de la tomate",
  "tomato two spotted spider mites leaf": "Acariens sur tomate",
  "grape leaf black rot": "Pourriture noire de la vigne",
  "grape leaf": "Feuille de vigne saine",
};

const prettyLabel = (value) => {
  const label = String(value).replace(/[_/]+/g, " ").replace(/\s+/g, " ").trim();
  return LABELS_FR[label.toLocaleLowerCase("en")] ?? label;
};

const TXT = {
  fr: {
    speakLabel: "Réponses vocales",
    hint: "Écris, parle, ou envoie une photo de ta plante : l'assistant garde tes analyses en mémoire.",
    placeholder: "Écris ta question…",
    send: "Envoyer",
    mic: "Parler",
    listening: "Enregistrement en cours…",
    photo: "Ajouter une photo",
    takePhoto: "Prendre une photo",
    fromGallery: "Choisir dans la galerie",
    cancel: "Annuler",
    stop: "Arrêter et envoyer",
    play: "Écouter",
    speakOn: "oui",
    speakOff: "non",
    thinking: "Réflexion…",
    transcribing: "Écoute en cours…",
    analyzing: "Analyse de la photo…",
    denied: "Micro refusé : autorise-le dans les réglages de l'appareil.",
    nomic: "Enregistrement vocal indisponible ici (HTTPS requis sur téléphone).",
    disclaimer: "Aide à la décision uniquement. Consulte un technicien agricole en cas de doute.",
    explain: "Explique-moi ce diagnostic et dis-moi quoi faire.",
    nothingFound: "Aucune maladie détectée sur cette photo.",
    askNothing: "L'analyse n'a rien trouvé sur ma photo. Qu'est-ce que je fais ?",
    confidence: "confiance",
    about: "Diagnostic",
  },
  derja: {
    speakLabel: "Jaweb bel sawt",
    hint: "Akteb, e7ki, walla ab3ath taswira mta3 nabtek : el mousa3ed yaff'dhker ettachkhis mte3ek.",
    placeholder: "Akteb so2elek…",
    send: "Ab3ath",
    mic: "E7ki",
    listening: "9a3ed yssajjel…",
    photo: "Zid taswira",
    takePhoto: "Sawwer taswira",
    fromGallery: "5tar mel galerie",
    cancel: "Bla",
    stop: "W9ef w ab3ath",
    play: "Isma3",
    speakOn: "eyh",
    speakOff: "lé",
    thinking: "Yfakker…",
    transcribing: "Yisma3…",
    analyzing: "Fama analyse lel taswira…",
    denied: "El micro marfoudh : a3ti el idhn fil réglages mta3 el telifoun.",
    nomic: "El ta7ssil el sawti mouch mawjoud houni (lazem HTTPS fil telifoun).",
    disclaimer: "Mousa3ed bark. Isma3 ra2y technicien fla7i ki tchek.",
    explain: "Fassarli el maradh hedha w chnowa na3mel ?",
    nothingFound: "Ma l9ina 7atta maradh fel taswira hedhi.",
    askNothing: "El analyse ma l9at chay fel taswira. Chnowa na3mel ?",
    confidence: "eth9a",
    about: "Ta7lil",
  },
};

/**
 * Chatbot derja : écrit, vocal, et analyse de photo dans la conversation.
 * Props : conversationId / initialMessages (reprise d'une conversation enregistrée) ;
 * entry = diagnostic venu d'une autre page ; autoExplain = expliquer ce diagnostic tout de suite.
 */
export default function AssistantChat({
  conversationId,
  initialMessages = [],
  entry = null,
  autoExplain = false,
  tall = false,
  onSaved,
}) {
  const { lang } = useLang();
  const t = TXT[lang] ?? TXT.fr;
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(""); // "" | "thinking" | "transcribing" | "analyzing"
  const [recording, setRecording] = useState(false);
  const [speak, setSpeak] = useState(autoExplain);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState(
    entry ? { label: entry.label, confidence: entry.confidence, status: entry.status ?? null } : null,
  );
  const idRef = useRef(conversationId ?? newId());
  const recRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const endRef = useRef(null);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const startedRef = useRef(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy]);
  useEffect(() => () => { clearTimeout(timerRef.current); audioRef.current?.pause(); }, []);

  // Persistance sur l'appareil à chaque changement (l'audio n'est pas enregistré).
  useEffect(() => {
    if (!messages.length) return;
    saveConversation({ id: idRef.current, messages });
    onSaved?.();
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (...msgs) => setMessages((m) => [...m, ...msgs]);

  const play = (url) => {
    audioRef.current?.pause();
    audioRef.current = new Audio(url);
    audioRef.current.play().catch(() => {}); // autoplay refusé : le bouton « Écouter » reste disponible
  };

  /** Envoie un message texte ; si les réponses vocales sont actives, la réponse est lue à voix haute. */
  async function ask(text, activeDiagnosis = diagnosis) {
    setError("");
    const history = messagesRef.current;
    add({ role: "user", content: text });
    setBusy("thinking");
    try {
      const analyses = toAnalyses(loadHistory());
      const reply = await sendChat(text, history, activeDiagnosis, speak ? "arabic" : "latin", analyses);
      let audioUrl;
      if (speak) {
        try { audioUrl = await fetchTts(reply); } catch (e) { setError(e.message); }
      }
      add({ role: "assistant", content: reply, audioUrl, rtl: speak });
      if (audioUrl) play(audioUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  // Depuis le détail d'un diagnostic : l'assistant l'explique tout seul, une seule fois.
  useEffect(() => {
    if (autoExplain && diagnosis && !startedRef.current && !initialMessages.length) {
      startedRef.current = true;
      ask(t.explain);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function submitText(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    ask(text);
  }

  /** Photo analysée sans quitter la conversation : YOLO, puis conseil de l'assistant. */
  async function analyzePhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de reprendre la même photo
    setPickerOpen(false);
    if (!file || busy) return;
    setError("");
    setBusy("analyzing");
    try {
      const small = await compressImage(file);
      const [{ data }, thumb] = await Promise.all([predict(small), thumbnail(small)]);
      const best = data.detections?.[0] ?? null;
      addHistory({
        date: Date.now(),
        thumb,
        top: best?.label ?? null,
        confidence: best?.confidence ?? null,
      });
      reportDetection(best?.label); // carte des risques, seulement si l'utilisateur partage sa position
      const found = best
        ? { label: best.label, confidence: best.confidence, status: null }
        : null;
      setDiagnosis(found);
      add({ role: "analysis", analysis: { label: best?.label ?? null, confidence: best?.confidence ?? null, thumb } });
      setBusy("");
      await ask(found ? t.explain : t.askNothing, found);
    } catch (err) {
      setError(errorMessage(err));
      setBusy("");
    }
  }

  async function listen(i) {
    const m = messages[i];
    if (m.audioUrl) return play(m.audioUrl);
    try {
      const url = await fetchTts(m.content);
      setMessages((all) => all.map((x, j) => (j === i ? { ...x, audioUrl: url } : x)));
      play(url);
    } catch (e) {
      setError(e.message);
    }
  }

  async function startRecording() {
    setError("");
    const mimeType = pickMimeType();
    if (mimeType === null || !navigator.mediaDevices?.getUserMedia) { setError(t.nomic); return; }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(t.denied);
      return;
    }
    // Débloque la lecture audio sur iOS : doit se faire pendant le geste de l'utilisateur.
    audioRef.current = new Audio();
    audioRef.current.play().catch(() => {});

    const chunks = [];
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    rec.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((tr) => tr.stop());
      clearTimeout(timerRef.current);
      setRecording(false);
      const blob = new Blob(chunks, { type: rec.mimeType || mimeType || "audio/webm" });
      if (blob.size < 1000) return; // clic accidentel
      const history = messagesRef.current;
      setBusy("transcribing");
      try {
        const r = await sendVoice(blob, history, diagnosis, toAnalyses(loadHistory()));
        add(
          { role: "user", content: r.transcript },
          { role: "assistant", content: r.reply, audioUrl: r.audioUrl, rtl: true },
        );
        play(r.audioUrl);
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy("");
      }
    };
    recRef.current = rec;
    rec.start();
    setRecording(true);
    timerRef.current = setTimeout(() => rec.state === "recording" && rec.stop(), MAX_RECORD_MS);
  }

  const stopRecording = () => recRef.current?.state === "recording" && recRef.current.stop();

  return (
    <section className="asst" aria-label="Assistant">
      {diagnosis && (
        <p className="asst-diag">
          {t.about} : <b>{prettyLabel(diagnosis.label)}</b> ({Math.round(diagnosis.confidence * 100)} %)
        </p>
      )}
      {messages.length === 0 && !busy && <p className="asst-hint">{t.hint}</p>}

      <div className={`asst-log${tall ? " tall" : ""}`} aria-live="polite">
        {messages.map((m, i) =>
          m.role === "analysis" ? (
            <div key={i} className="asst-msg analysis">
              {m.analysis.thumb && <img src={m.analysis.thumb} alt="" className="asst-thumb" />}
              <span>
                <b>{m.analysis.label ? prettyLabel(m.analysis.label) : t.nothingFound}</b>
                {m.analysis.confidence != null && (
                  <em>{t.confidence} : {Math.round(m.analysis.confidence * 100)} %</em>
                )}
              </span>
            </div>
          ) : (
            <div key={i} className={`asst-msg ${m.role}`} dir={m.rtl ? "rtl" : "auto"}>
              <p>{m.content}</p>
              {m.role === "assistant" && (m.audioUrl || hasArabic(m.content)) && (
                <button type="button" className="asst-play" onClick={() => listen(i)}>
                  <Icon name="play" className="asst-ico-xs" />
                  {t.play}
                </button>
              )}
            </div>
          ),
        )}
        {busy && (
          <div className="asst-msg assistant asst-busy">
            {busy === "thinking" ? t.thinking : busy === "analyzing" ? t.analyzing : t.transcribing}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <div className="asst-error" role="alert">{error}</div>}

      <button
        type="button"
        className={`asst-toggle${speak ? " on" : ""}`}
        onClick={() => setSpeak((v) => !v)}
        aria-pressed={speak}
      >
        <Icon name={speak ? "volume" : "volumeOff"} className="asst-ico-xs" />
        {t.speakLabel} : {speak ? t.speakOn : t.speakOff}
      </button>

      {pickerOpen && (
        <div className="asst-picker" role="group" aria-label={t.photo}>
          <button type="button" onClick={() => cameraRef.current?.click()}>
            <Icon name="camera" className="asst-ico" />
            {t.takePhoto}
          </button>
          <button type="button" onClick={() => galleryRef.current?.click()}>
            <Icon name="gallery" className="asst-ico" />
            {t.fromGallery}
          </button>
          <button type="button" className="ghost" onClick={() => setPickerOpen(false)}>
            {t.cancel}
          </button>
        </div>
      )}

      <form className="asst-form" onSubmit={submitText}>
        <button
          type="button"
          className="asst-photo"
          onClick={() => setPickerOpen((v) => !v)}
          disabled={!!busy || recording}
          aria-expanded={pickerOpen}
          aria-label={t.photo}
          title={t.photo}
        >
          <Icon name="image" className="asst-ico" />
        </button>
        {/* Deux champs : « capture » ouvre l'appareil photo, sans lui le téléphone propose la galerie. */}
        <input ref={cameraRef} className="asst-hidden" type="file" accept="image/*" capture="environment" onChange={analyzePhoto} />
        <input ref={galleryRef} className="asst-hidden" type="file" accept="image/*" onChange={analyzePhoto} />
        <button
          type="button"
          className={`asst-mic${recording ? " rec" : ""}`}
          onClick={recording ? stopRecording : startRecording}
          disabled={!!busy}
          aria-label={recording ? t.stop : t.mic}
          title={recording ? t.stop : t.mic}
        >
          <Icon name={recording ? "stop" : "mic"} className="asst-ico" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={recording ? t.listening : t.placeholder}
          disabled={recording || !!busy}
          maxLength={2000}
        />
        <button
          type="submit"
          className="asst-send"
          disabled={!input.trim() || !!busy || recording}
          aria-label={t.send}
          title={t.send}
        >
          <Icon name="send" className="asst-ico" />
        </button>
      </form>
      <p className="asst-disclaimer">{t.disclaimer}</p>
    </section>
  );
}
