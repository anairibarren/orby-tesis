import React, { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useNavigate, useLocation } from "react-router-dom";

const Chat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { providerId, providerName, service } = location.state || {};

  if (!providerId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <p className="text-lg mb-4">Prestador no definido</p>
        <button
          className="px-4 py-2 bg-[#2A4691] text-white rounded-full"
          onClick={() => navigate(-1)}
        >
          Volver
        </button>
      </div>
    );
  }

  const [messages, setMessages] = useState([
    { id: 1, text: "Hola! ¿Cómo puedo ayudarte?", sender: "provider" }
  ]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef(null);

  const sendMessage = () => {
    if (!text.trim()) return;
    const newMessage = { id: messages.length + 1, text, sender: "user" };
    setMessages([...messages, newMessage]);
    setText("");

    // Respuesta automática simulada
    setTimeout(() => {
      const reply = {
        id: messages.length + 2,
        text: "Gracias por tu mensaje, pronto te responderé.",
        sender: "provider"
      };
      setMessages(prev => [...prev, reply]);
    }, 1200);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      <div className="flex items-center justify-between p-4 mt-3 ">
        <Icon
          icon="ep:arrow-left-bold"
          className="text-2xl cursor-pointer"
          onClick={() => navigate(-1)}
        />
        <div className="text-center">
          <div className="font-bold text-xl">{providerName}</div>
          <div className="text-sm text-gray-500">{service}</div>
        </div>
        <div className="w-6" />
      </div>


      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`p-3 rounded-2xl max-w-xs break-words ${
                msg.sender === "user"
                  ? "bg-[#2A4691] text-white rounded-br-none"
                  : "bg-[#F0F0F0] text-black rounded-bl-none"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center p-3">
        <Icon icon="akar-icons:plus" className="text-black text-2xl mr-3 cursor-pointer" />
        <input
          type="text"
          placeholder="Escribi un mensaje"
          className="flex-1 p-3 border bg-[#F0F0F0] rounded-full focus:outline-none focus:ring-1 focus:ring-[#d5d5d5]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <Icon
          icon="fluent:send-28-filled"
          className="text-black text-2xl ml-3 cursor-pointer"
          onClick={sendMessage}
        />
      </div>
    </div>
  );
};

export default Chat;