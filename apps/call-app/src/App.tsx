import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { SERVER_URL } from "./constants/api";
import { useParams } from "react-router";
import axios, { AxiosError } from "axios";

export default function () {
  const { roomId } = useParams();

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
    if (socket == null || peerConnection == null) {
      setSocket(io(SERVER_URL));
      setPeerConnection(
        new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        })
      );
    }
  }, [socket, peerConnection]);

  useEffect(() => {
    if (socket && peerConnection) {
      initPeerConnection();
      initSocket();
      initLocalStream();
    }
  }, [socket, peerConnection]);

  // Initialize the socket events
  const initSocket = useCallback(() => {
    if (socket && peerConnection) {
      {
        socket.on("offer", async (message: any) => {
          const offer = new RTCSessionDescription(message.offer);
          await peerConnection?.setRemoteDescription(offer);
          const answer = await peerConnection?.createAnswer();
          await peerConnection?.setLocalDescription(answer);
          socket?.emit("answer", { answer });
        });
        socket.on("answer", async (message) => {
          const answer = new RTCSessionDescription(message.answer);
          await peerConnection?.setRemoteDescription(answer);
        });

        socket.on("new-ice-candidate", async (message) => {
          if (message.iceCandidate) {
            try {
              await peerConnection?.addIceCandidate(message.iceCandidate);
            } catch (e) {
              console.error("Error adding received ice candidate", e);
            }
          }
        });
      }
    }
  }, [socket, peerConnection]);

  //  Initialize the peerConnection Event Listeners
  const initPeerConnection = useCallback(() => {
    if (peerConnection) {
      peerConnection.addEventListener("connectionstatechange", () => {
        if (peerConnection?.connectionState === "connected") {
          // Peers connected!
        }
      });

      peerConnection.addEventListener("icecandidate", (event) => {
        if (event.candidate) {
          socket?.emit("new-ice-candidate", {
            iceCandidate: event.candidate,
          });
        }
      });
      peerConnection.addEventListener("track", async (event) => {
        const [remoteStream] = event.streams;
        if (remoteVideoRef.current)
          remoteVideoRef.current.srcObject = remoteStream;
      });
    }
  }, [peerConnection]);

  // Start the local video stream, join the room & send an offer
  const initLocalStream = () => {
    (async () => {
      if (socket && peerConnection) {
        axios
          .get(`http://localhost:3000/joinRoom/${roomId}`)
          .then(async () => {
            socket.emit("join", { roomId });
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            stream.getTracks().forEach((track) => {
              peerConnection?.addTrack(track, stream);
            });
            // create a peer and set Local Desriptino
            const offer = await peerConnection?.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });
            await peerConnection?.setLocalDescription(offer);
            socket?.emit("offer", { offer });
          })
          .catch((err: AxiosError) => {
            let error = err.response?.data as any;
            alert(error.error);
          });
      }
    })();
  };

  return (
    <>
      <video ref={localVideoRef} width={480} autoPlay></video>
      <video ref={remoteVideoRef} width={480} autoPlay></video>
    </>
  );
}
