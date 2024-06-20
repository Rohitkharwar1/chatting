import React, { useEffect, useState } from "react";
import "./chatList.css";
import AddUser from "./addUser/AddUser";
import { useUserStore } from "../../lib/userStore";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useChatStore } from "../../lib/chatStore";

const ChatList = () => {
  const [chats, setChats] = useState([]);
  const [addMode, setAddMode] = useState(false);
  const [input, setInput] = useState("");

  const { currentUser } = useUserStore();
  const { chatId, changeChat } = useChatStore();

  useEffect(() => {
    if (!currentUser || !currentUser.id) {
      console.log("Current user is not set.");
      return;
    }

    const unSub = onSnapshot(
      doc(db, "userChats", currentUser.id),
      async (res) => {
        if (!res.exists()) {
          console.log("No chats document found.");
          setChats([]);
          return;
        }

        const data = res.data();
        if (!data.chats) {
          console.log("No chats field found in the document.");
          setChats([]);
          return;
        }

        const items = data.chats;

        try {
          const promises = items.map(async (item) => {
            const userDocRef = doc(db, "users", item.receiverId);
            const userDocSnap = await getDoc(userDocRef);
            const user = userDocSnap.exists() ? userDocSnap.data() : null;
            return { ...item, user };
          });

          const chatData = await Promise.all(promises);
          setChats(chatData.sort((a, b) => b.updatedAt - a.updatedAt));
        } catch (err) {
          console.error("Error fetching chat data:", err);
        }
      },
      (error) => {
        console.error("Error listening to chat updates:", error);
      }
    );

    return () => {
      unSub();
    };
  }, [currentUser]);

  const handleSelect = async (chat) => {
    const userChats = chats.map((item) => {
      const { user, ...rest } = item;
      return rest;
    });

    const chatIndex = userChats.findIndex(
      (item) => item.chatId === chat.chatId
    );
    userChats[chatIndex].isSeen = true;

    const userChatRef = doc(db, "userChats", currentUser.id);
    try {
      await updateDoc(userChatRef, {
        chats: userChats,
      });
      changeChat(chat.chatId, chat.user);
    } catch (err) {
      console.log(err);
    }
  };

  const filteredChats = chats.filter((c) =>
    c.user.username.toLowerCase().includes(input.toLowerCase())
  );

  return (
    <>
      <div className="chatList">
        <div className="search">
          <div className="searchBar">
            <img src="../../../../public/search.png" alt="search" />
            <input
              type="text"
              placeholder="search"
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <img
            src={
              addMode
                ? "../../../../public/minus.png"
                : "../../../../public/plus.png"
            }
            alt="toggle add mode"
            className="add"
            onClick={() => setAddMode((prev) => !prev)}
          />
        </div>
      </div>
      {chats.length > 0 ? (
        filteredChats.map((chat) => (
          <div
            className="item"
            key={chat.chatId}
            onClick={() => handleSelect(chat)}
            style={{
              backgroundColor: chat?.isSeen ? "transparent" : "#5183fe",
            }}
          >
            <img
              src={
                chat.user.blocked.includes(currentUser.id)
                  ? "../../../../public/avatar.png"
                  : chat.user?.avatar || "../../../../public/avatar.png"
              }
              alt="avatar"
            />
            <div className="texts">
              <span>
                {chat.user.blocked.includes(currentUser.id)
                  ? "User"
                  : chat.user.username}
              </span>
              <p>{chat.lastMessage}</p>
            </div>
          </div>
        ))
      ) : (
        <p>No chats found.</p>
      )}
      {addMode && <AddUser />}
    </>
  );
};

export default ChatList;
