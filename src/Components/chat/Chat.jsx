import React, { useEffect, useRef, useState } from "react";
import "./chat.css";
import EmojiPicker from "emoji-picker-react";
import {
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useChatStore } from "../lib/chatStore";
import { useUserStore } from "../lib/userStore";
import upload from "../lib/upload";

const Chat = () => {
  const [chat, setChats] = useState(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [img, setImg] = useState({
    file: null,
    url: "",
  });

  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked } =
    useChatStore();
  const { currentUser } = useUserStore();

  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  useEffect(() => {
    if (!chatId) return;

    const chatDoc = doc(db, "chats", chatId);
    const unsub = onSnapshot(chatDoc, (res) => {
      setChats(res.data());
    });
    return () => {
      unsub();
    };
  }, [chatId]);

  console.log(chat);

  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
    setOpen(false);
  };

  const handleImg = (e) => {
    if (e.target.files[0]) {
      setImg({
        file: e.target.files[0],
        url: URL.createObjectURL(e.target.files[0]),
      });
    }
  };

  const handleSend = async () => {
    if (text === "") return;

    let imgUrl = null;

    try {
      if (img.file) {
        imgUrl = await upload(img.file);
      }

      await updateDoc(doc(db, "chats", chatId), {
        messages: arrayUnion({
          senderId: currentUser.id,
          text,
          createdAt: new Date(),
          ...(imgUrl && { img: imgUrl }),
        }),
      });

      const userIDs = [currentUser.id, user.id];
      const updatePromises = userIDs.map(async (id) => {
        const userChatRef = doc(db, "userChats", id);
        const userChatsSnapshot = await getDoc(userChatRef);

        if (userChatsSnapshot.exists()) {
          const userChatsData = userChatsSnapshot.data();
          const chatIndex = userChatsData.chats.findIndex(
            (c) => c.chatId === chatId
          );

          if (chatIndex !== -1) {
            userChatsData.chats[chatIndex].lastMessage = text;
            userChatsData.chats[chatIndex].isSeen =
              id === currentUser.id ? true : false;
            userChatsData.chats[chatIndex].updatedAt = Date.now();

            await updateDoc(userChatRef, {
              chats: userChatsData.chats,
            });
          }
        }
      });

      await Promise.all(updatePromises);
    } catch (err) {
      console.log(err);
    }
    setImg({
      file: null,
      url: "",
    });
    setText("");
  };

  return (
    <div className="chat">
      <div className="top">
        <div className="user">
          <img src={user?.avatar || "../../../public/avatar.png"} alt="" />
          <div className="texts">
            <span>{user?.username || "User"}</span>
            <p>{chat?.lastMessage || "No messages yet"}</p>
          </div>
        </div>
        <div className="icons">
          <img src="../../../public/phone.png" alt="" />
          <img src="../../../public/video.png" alt="" />
          <img src="../../../public/info.png" alt="" />
        </div>
      </div>
      <div className="center">
        {chat && chat.messages ? (
          chat.messages.map((message, index) => (
            <div
              key={index}
              className={`message ${
                message.senderId === currentUser.id ? "own" : ""
              }`}
            >
              {message.img && (
                <img
                  src={message.img}
                  alt=""
                  className="message-img" // Added className to style images
                />
              )}
              <div className="texts">
                <p>{message.text}</p>
                <span>
                  {new Date(
                    message.createdAt.seconds * 1000
                  ).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p>Loading messages...</p>
        )}
        {img.url && (
          <div className="message own">
            <img
              src={img.url}
              alt=""
              className="message-img" // Added className to style images
            />
          </div>
        )}
        <div ref={endRef}></div>
      </div>
      <div className="bottom">
        <div className="icons">
          <label htmlFor="file">
            <img src="../../../public/img.png" alt="" />
          </label>
          <input
            type="file"
            id="file"
            style={{ display: "none" }}
            onChange={handleImg}
          />
          <img src="./camera.png" alt="" />
          <img src="./mic.png" alt="" />
        </div>
        <input
          type="text"
          placeholder={
            isCurrentUserBlocked || isReceiverBlocked
              ? "You cannot send messages"
              : "Type a message..."
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isCurrentUserBlocked || isReceiverBlocked}
        />
        <button onClick={() => setOpen(!open)}>😊</button>
        {open && <EmojiPicker onEmojiClick={handleEmoji} />}
        <button
          className="sendButton"
          onClick={handleSend}
          disabled={isCurrentUserBlocked || isReceiverBlocked}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
