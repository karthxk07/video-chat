import { MouseEvent, useEffect, useRef, useState } from "react";
import "./App.css";
import { io, Socket } from "socket.io-client";

function App() {
  // Configuration for the stun server

  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  // States
  const socket: Socket = io("ws://localhost:3000");
  const peerConnection = new RTCPeerConnection(configuration);
  // Effects

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

  peerConnection.addEventListener("connectionstatechange", (event) => {
    if (peerConnection.connectionState === "connected") {
      // Peers connected!
      console.log("COnnected");
    }
  });

  peerConnection.addEventListener("icecandidate", (event) => {
    console.log(event.candidate);
    if (event.candidate) {
      console.log("emit");
      socket?.emit("new-ice-candidate", { iceCandidate: event.candidate });
    }
  });
  peerConnection.addEventListener("track", async (event) => {
    console.log("sdfjsdasf");
    const [remoteStream] = event.streams;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  });

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const joinBtnRef = useRef<HTMLButtonElement>(null);

  // Set the local video stream
  const setLocalStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    stream.getTracks().forEach((track) => {
      console.log("Added local track", track);
      peerConnection.addTrack(track, stream);
    });
    console.log(peerConnection);
  };

  // Event Handlers
  const joinHandler = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // update the socket and sent a join event
    socket.emit("join", { roomId: "123" });
    setLocalStream();

    // create a peer and set Local Desriptino
    const offer = await peerConnection?.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await peerConnection?.setLocalDescription(offer);
    socket?.emit("offer", { offer });
  };

  return (
    <>
      <video ref={localVideoRef} width={480} autoPlay></video>
      <video ref={remoteVideoRef} width={480} autoPlay></video>
      <button ref={joinBtnRef} onClick={joinHandler}>
        Join
      </button>
    </>
  );
}

export default App;
