import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export default function CallView() {
  // States
  const [socket, setSocket] = useState<Socket | null>(null);
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Effects

  // Initialize the socket and the peer connection
  useEffect(() => {
    setSocket(io("https://video-chat-98k5.onrender.com"));
    setPeerConnection(
      new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      })
    );
  }, []);

  // Initialize the socket events & peerConnection event listeners
  useEffect(() => {
    if (socket && peerConnection) {
      // Socket events
      {
        socket.on("offer", async (message: any) => {
          console.log(message);
          const offer = new RTCSessionDescription(message.offer);
          await peerConnection?.setRemoteDescription(offer);
          const answer = await peerConnection?.createAnswer();
          await peerConnection?.setLocalDescription(answer);
          socket?.emit("answer", { answer });
          console.log(peerConnection);
        });
        socket.on("answer", async (message) => {
          console.log(message);
          const answer = new RTCSessionDescription(message.answer);
          await peerConnection?.setRemoteDescription(answer);
          console.log(peerConnection);
        });

        socket.on("new-ice-candidate", async (message) => {
          console.log("Reveiced Candidate: ", message);
          if (message.iceCandidate) {
            try {
              await peerConnection.addIceCandidate(message.iceCandidate);
            } catch (e) {
              console.error("Error adding received ice candidate", e);
            }
          }
        });
      }

      //  peerConnection Event Listeners
      {
        peerConnection.addEventListener("connectionstatechange", () => {
          if (peerConnection.connectionState === "connected") {
            // Peers connected!
            console.log("COnnected");
          }
        });

        peerConnection.addEventListener("icecandidate", (event) => {
          console.log(event.candidate);
          if (event.candidate) {
            console.log("emit");
            socket?.emit("new-ice-candidate", {
              iceCandidate: event.candidate,
            });
          }
        });
        peerConnection.addEventListener("track", async (event) => {
          console.log("sdfjsdasf");
          const [remoteStream] = event.streams;
          if (remoteVideoRef.current)
            remoteVideoRef.current.srcObject = remoteStream;
        });
      }
    }
  }, [socket, peerConnection]);

  // Start the local video stream and join the room
  useEffect(() => {
    (async () => {
      if (socket && peerConnection) {
        // update the socket and sent a join event
        socket.emit("join", { roomId: "123" });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });
        // create a peer and set Local Desriptino
        const offer = await peerConnection?.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await peerConnection?.setLocalDescription(offer);
        socket?.emit("offer", { offer });
      }
    })();
  }, [socket, peerConnection]);

  return (
    <>
      <video ref={localVideoRef} width={480} autoPlay></video>
      <video ref={remoteVideoRef} width={480} autoPlay></video>
    </>
  );
}
