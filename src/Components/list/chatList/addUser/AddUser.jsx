import React, { useState } from "react";
import "./addUser.css";
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  getDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useUserStore } from "../../../lib/userStore";

const AddUser = () => {
  const [user, setUser] = useState(null);
  const { currentUser } = useUserStore();

  const handleSearch = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get("username");
    try {
      const userRef = collection(db, "users");

      // Create a query against the collection.
      const q = query(userRef, where("username", "==", username));
      const querySnapShot = await getDocs(q);
      if (!querySnapShot.empty) {
        setUser(querySnapShot.docs[0].data());
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleAdd = async () => {
    if (!user || !currentUser) return;

    const chatRef = collection(db, "chats");
    const userChatRef = doc(db, "userChats", currentUser.id);
    const receiverChatRef = doc(db, "userChats", user.id);

    try {
      const newChatRef = doc(chatRef);
      await setDoc(newChatRef, {
        createdAt: serverTimestamp(),
        messages: [],
      });

      // Ensure userChats document exists for both users
      await setDoc(userChatRef, { chats: [] }, { merge: true });
      await setDoc(receiverChatRef, { chats: [] }, { merge: true });

      // Initial chat data without timestamp
      const chatData = {
        chatId: newChatRef.id,
        lastMessage: "",
        receiverId: user.id,
        updatedAt: Date.now(), // temporary timestamp
      };

      await updateDoc(userChatRef, {
        chats: arrayUnion(chatData),
      });

      await updateDoc(receiverChatRef, {
        chats: arrayUnion({
          ...chatData,
          receiverId: currentUser.id,
        }),
      });

      // Fetch userChats document for currentUser to update timestamp
      const userChatDoc = await getDoc(userChatRef);
      if (userChatDoc.exists()) {
        const userChats = userChatDoc.data().chats;
        const updatedUserChats = userChats.map((chat) =>
          chat.chatId === newChatRef.id
            ? { ...chat, updatedAt: Date.now() }
            : chat
        );
        await updateDoc(userChatRef, {
          chats: updatedUserChats,
        });
      }

      // Fetch userChats document for the receiver to update timestamp
      const receiverChatDoc = await getDoc(receiverChatRef);
      if (receiverChatDoc.exists()) {
        const receiverChats = receiverChatDoc.data().chats;
        const updatedReceiverChats = receiverChats.map((chat) =>
          chat.chatId === newChatRef.id
            ? { ...chat, updatedAt: Date.now() }
            : chat
        );
        await updateDoc(receiverChatRef, {
          chats: updatedReceiverChats,
        });
      }

      console.log("New chat created with ID:", newChatRef.id);
    } catch (err) {
      console.log("Error adding chat:", err);
    }
  };

  return (
    <div className="addUser">
      <form onSubmit={handleSearch}>
        <input type="text" placeholder="Username" name="username" />
        <button>Search</button>
      </form>
      {user && (
        <div className="user">
          <div className="detail">
            <img src={user.avatar || "./avatar.png"} alt="" />
            <span>{user.username}</span>
          </div>
          <button onClick={handleAdd}>Add User</button>
        </div>
      )}
    </div>
  );
};

export default AddUser;
