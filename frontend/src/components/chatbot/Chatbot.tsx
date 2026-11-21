/**
 * Chatbot
 *
 * Root chatbot component — drop this anywhere and the
 * floating button + window are self-contained.
 *
 * Usage:
 *   import Chatbot from "../components/chatbot/Chatbot";
 *   <Chatbot />
 */

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import ChatButton from "./ChatButton";
import ChatWindow from "./ChatWindow";

export default function Chatbot() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {open && (
          <ChatWindow key="chat-window" onClose={() => setOpen(false)} />
        )}
      </AnimatePresence>

      {/* Hide button while window is open on mobile to avoid overlap */}
      {!open && (
        <ChatButton onClick={() => setOpen(true)} />
      )}

      {/* On desktop show button even when window is open (for close context) */}
      {open && (
        <div className="hidden md:block">
          <ChatButton onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
