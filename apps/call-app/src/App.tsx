import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { SERVER_URL, LANDING_PAGE_URL } from "./constants/api";
import { useParams } from "react-router";
import axios from "axios";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  AlertTriangle,
  Share2,
  Check,
} from "lucide-react";

export default function VideoCall() {
  const { roomId } = useParams();

  // States
  const [socket, setSocket] = useState<Socket | null>(null);
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [peerDisconnected, setPeerDisconnected] = useState(false);
  const [disconnectionTimer, setDisconnectionTimer] = useState<number>(0);
  const [isShared, setIsShared] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  // Effects
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

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const initSocket = useCallback(() => {
    if (socket && peerConnection) {
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
  }, [socket, peerConnection]);

  const initPeerConnection = useCallback(() => {
    if (peerConnection) {
      peerConnection.addEventListener("connectionstatechange", () => {
        switch (peerConnection.connectionState) {
          case "connected":
            setIsConnected(true);
            setPeerDisconnected(false);
            break;
          case "disconnected":
          case "failed":
            handlePeerDisconnection();
            break;
          case "closed":
            setPeerDisconnected(true);
            setIsConnected(false);
            break;
        }
      });

      peerConnection.addEventListener("iceconnectionstatechange", () => {
        if (peerConnection.iceConnectionState === "disconnected") {
          handlePeerDisconnection();
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
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });
    }
  }, [peerConnection]);

  const handlePeerDisconnection = () => {
    setPeerDisconnected(true);
    setIsConnected(false);
    setDisconnectionTimer(10);

    // Start countdown timer
    let timeLeft = 10;
    timerRef.current = setInterval(() => {
      timeLeft -= 1;
      setDisconnectionTimer(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(timerRef.current);
        endCall();
      }
    }, 1000);
  };

  const initLocalStream = () => {
    (async () => {
      if (socket && peerConnection) {
        try {
          await axios.get(`${SERVER_URL}/joinRoom/${roomId}`);
          socket.emit("join", { roomId });
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });

          localStreamRef.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;

          stream.getTracks().forEach((track) => {
            peerConnection?.addTrack(track, stream);
          });

          const offer = await peerConnection?.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await peerConnection?.setLocalDescription(offer);
          socket?.emit("offer", { offer });
        } catch (err: any) {
          const error = err.response?.data;
          alert(error?.error || "Failed to join room");
          window.location.href = LANDING_PAGE_URL;
        }
      }
    })();
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (socket) {
      socket.disconnect();
    }
    if (peerConnection) {
      peerConnection.close();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    window.location.href = LANDING_PAGE_URL;
  };

  const handleShare = async () => {
    const callLink = `${window.location.origin}/${roomId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join my video call",
          text: "Click the link to join my video call",
          url: callLink,
        });
      } else {
        await navigator.clipboard.writeText(callLink);
        setIsShared(true);
        setTimeout(() => setIsShared(false), 2000);
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-800 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Videos Container */}
        <div className="flex-1 flex w-full gap-x-5 p-5">
          {/* Local Video */}
          <div className="w-1/2 h-full relative">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full rounded-xl overflow-hidden object-cover mirror-mode"
            />
            <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-75 px-3 py-1 rounded-lg">
              <p className="text-white text-sm">You</p>
            </div>
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <VideoOff className="w-16 h-16 text-gray-500" />
              </div>
            )}
          </div>

          {/* Remote Video */}
          <div className="w-1/2 h-full relative">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full rounded-xl overflow-hidden object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-75 px-3 py-1 rounded-lg">
              <p className="text-white text-sm">Remote User</p>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="w-full bg-gray-800 bg-opacity-90 py-6 px-4 flex justify-center items-center space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full ${
              isAudioEnabled
                ? "bg-gray-600 hover:bg-gray-700"
                : "bg-red-500 hover:bg-red-600"
            } transition-colors`}
          >
            {isAudioEnabled ? (
              <Mic className="w-6 h-6 text-white" />
            ) : (
              <MicOff className="w-6 h-6 text-white" />
            )}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full ${
              isVideoEnabled
                ? "bg-gray-600 hover:bg-gray-700"
                : "bg-red-500 hover:bg-red-600"
            } transition-colors`}
          >
            {isVideoEnabled ? (
              <Video className="w-6 h-6 text-white" />
            ) : (
              <VideoOff className="w-6 h-6 text-white" />
            )}
          </button>

          <button
            onClick={handleShare}
            className={`p-4 rounded-full ${
              isShared ? "bg-green-500" : "bg-gray-600 hover:bg-gray-700"
            } transition-colors`}
            title="Share call link"
          >
            {isShared ? (
              <Check className="w-6 h-6 text-white" />
            ) : (
              <Share2 className="w-6 h-6 text-white" />
            )}
          </button>

          <button
            onClick={endCall}
            className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Alerts and Status Messages */}
      {peerDisconnected && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-500 text-white px-6 py-3 rounded-lg flex items-center shadow-lg">
            <AlertTriangle className="w-6 h-6 mr-3" />
            <div>
              <p className="font-medium">Peer disconnected</p>
              <p className="text-sm">
                Redirecting in {disconnectionTimer} seconds...
              </p>
            </div>
          </div>
        </div>
      )}

      {!isConnected && !peerDisconnected && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center">
            <div className="animate-pulse mr-2 h-2 w-2 bg-white rounded-full"></div>
            Connecting to peer...
          </div>
        </div>
      )}
    </div>
  );
}
