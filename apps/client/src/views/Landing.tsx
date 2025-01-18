import axios from "axios";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";

function App() {
  const [roomId, setRoomId] = useState<string | undefined>(undefined);
  const roomIdInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  return (
    // Configuration for the stun server
    <>
      <input ref={roomIdInputRef} type="text" value={roomId} />
      <button
        onClick={() => {
          if (roomIdInputRef.current)
            location.assign(
              `http://localhost:5174/${roomIdInputRef.current.value}`
            );
        }}
      >
        Join Call
      </button>
      <label>{`Room Id : ${roomId}`} </label>
      <button
        onClick={() => {
          axios.get("http://localhost:3000/createRoom").then((res) => {
            if (res.status === 200) {
              setRoomId(res.data.id);
            }
          });
        }}
      >
        Create Room
      </button>
    </>
  );
}

export default App;
