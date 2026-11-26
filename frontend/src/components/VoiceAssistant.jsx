import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { useLang } from "../LangContext";

function normalizeText(text) {
  return text
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function VoiceAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, t } = useLang();
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const handleResult = (event) => {
      const top = event.detail?.top;
      const confidence = event.detail?.confidence;
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const text = top
        ? lang === "derja"
          ? `Natija: ${top}. El thi9a qadech ${Math.round(confidence * 100)} fi l miya.`
          : `Résultat : ${top}. Niveau de confiance : ${Math.round(confidence * 100)} pour cent.`
        : t("nothing");
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "derja" ? "ar-TN" : "fr-FR";
      utterance.rate = 0.92;
      window.speechSynthesis.speak(utterance);
    };
    window.addEventListener("agrivision:analysis-result", handleResult);
    return () => window.removeEventListener("agrivision:analysis-result", handleResult);
  }, [lang, t]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setSupported(false);
      return undefined;
    }
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = lang === "derja" ? "ar-TN" : "fr-FR";
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const text = normalizeText(event.results[0][0].transcript);
      if (/scanner|scan|tachkhis|analyse|sawwer/.test(text)) {
        navigate("/scan");
      } else if (/historique|historik|mela7dhat/.test(text)) {
        navigate("/history");
      } else if (/plante|nabati|nabta|carne/.test(text)) {
        navigate("/plants");
      } else if (/outil|outils|modele|model/.test(text)) {
        navigate(/modele|model/.test(text) ? "/model" : "/tools");
      } else if (/accueil|dar|home|rajes|page principale/.test(text)) {
        navigate("/");
      }
    };
    recognitionRef.current = recognition;
    return () => recognition.abort();
  }, [lang, navigate]);

  const toggleListening = () => {
    if (!supported || !recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  if (location.pathname === "/scan") return null;

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={!supported}
      aria-label={listening ? t("voiceStop") : t("voiceStart")}
      title={supported ? (listening ? t("voiceStop") : t("voiceStart")) : t("voiceUnavailable")}
      className={`fixed bottom-[88px] right-4 z-[45] flex h-[52px] w-[52px] items-center justify-center rounded-full border-4 border-white shadow-xl transition active:scale-95 ${
        listening
          ? "animate-pulse bg-red-500 text-white"
          : "bg-[#2f7042] text-white disabled:bg-gray-400"
      }`}
      style={{ bottom: "calc(88px + env(safe-area-inset-bottom))" }}
    >
      <Icon name={listening ? "stop" : "mic"} className="h-6 w-6" />
    </button>
  );
}
