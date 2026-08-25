import type { SocialMessage } from "../social/SocialFabric";

interface Props {
  message: SocialMessage;
  isMine: boolean;
}

export default function ChatBubble({ message, isMine }: Props) {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
      {/* Sender label */}
      <div className="font-mono text-[8px] text-zinc-600 mb-1 px-1">
        {isMine ? "VOCÊ" : message.senderPubKey.slice(0, 8)} · {time}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] px-4 py-2.5 font-sans text-sm leading-relaxed ${
          isMine
            ? "bg-[#a855f7]/15 text-[#d4a5ff] border border-[#a855f7]/20 rounded-t-lg rounded-bl-lg rounded-br-sm"
            : "bg-[#1a1f26] text-zinc-300 border border-[#1a1f26] rounded-t-lg rounded-br-lg rounded-bl-sm"
        }`}
      >
        {message.content}
      </div>

      {/* Status indicator */}
      {isMine && (
        <div className="font-mono text-[8px] text-zinc-600 mt-0.5 px-1">
          ✓✓ E2EE
        </div>
      )}
    </div>
  );
}
