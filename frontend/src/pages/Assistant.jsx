import { useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import AssistantChat from "../components/AssistantChat";
import Icon from "../components/Icon";
import { useLang } from "../LangContext";
import { listConversations, newId, removeConversation } from "../services/conversations";

const TXT = {
  fr: { title: "Conversations", nouveau: "Nouvelle", voir: "Historique", masquer: "Masquer", vide: "Aucune conversation enregistrée.", suppr: "Supprimer" },
  derja: { title: "El 7adiths", nouveau: "Jdida", voir: "El 9dim", masquer: "5abbi", vide: "Ma fama 7atta 7adith mahfoudh.", suppr: "Fassa5" },
};

const when = (value) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    .format(new Date(value));

/** Page « Assistant » : conversations enregistrées + chat derja (écrit, vocal, photo). */
export default function Assistant() {
  const { state } = useLocation();
  const { lang } = useLang();
  const t = TXT[lang] ?? TXT.fr;
  const [conversations, setConversations] = useState(listConversations);
  const [showList, setShowList] = useState(false);
  // `current` décrit la conversation affichée : soit une reprise, soit une nouvelle.
  const [current, setCurrent] = useState(() => ({ id: newId(), messages: [] }));

  const refresh = useCallback(() => setConversations(listConversations()), []);

  const open = (conversation) => {
    setCurrent({ id: conversation.id, messages: conversation.messages ?? [] });
    setShowList(false);
  };

  const startNew = () => {
    setCurrent({ id: newId(), messages: [] });
    setShowList(false);
  };

  const drop = (id, event) => {
    event.stopPropagation();
    removeConversation(id);
    refresh();
    if (id === current.id) startNew();
  };

  return (
    <>
      <div className="asst-bar">
        <button type="button" className="primary" onClick={startNew}>
          <Icon name="plus" className="asst-ico-xs" />
          {t.nouveau}
        </button>
        <button type="button" onClick={() => setShowList((v) => !v)} aria-expanded={showList}>
          <Icon name="history" className="asst-ico-xs" />
          {showList ? t.masquer : `${t.voir} (${conversations.length})`}
        </button>
      </div>

      {showList && (
        <div className="asst-convs">
          {conversations.length === 0 && <p className="asst-hint">{t.vide}</p>}
          {conversations.map((c) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              className={`asst-conv${c.id === current.id ? " current" : ""}`}
              onClick={() => open(c)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && open(c)}
            >
              <span>
                <b>{c.title}</b>
                <em>{when(c.updatedAt)}</em>
              </span>
              <button type="button" className="asst-conv-del" aria-label={`${t.suppr} : ${c.title}`} onClick={(e) => drop(c.id, e)}>
                <Icon name="trash" className="asst-ico-xs" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AssistantChat
        key={current.id}
        conversationId={current.id}
        initialMessages={current.messages}
        entry={state?.diagnosis ?? null}
        autoExplain={!!state?.autoExplain}
        onSaved={refresh}
        tall
      />
    </>
  );
}
