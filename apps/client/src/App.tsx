import axios from "axios";
import { useRef, useState } from "react";
import { Loader2, Video, Users, Copy, Check } from "lucide-react";
import { CALL_PAGE_URL, SERVER_URL } from "./constants/api";

function App() {
  const [roomId, setRoomId] = useState<string | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const roomIdInputRef = useRef<HTMLInputElement>(null);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await axios.get(`${SERVER_URL}/createRoom`);
      if (res.status === 200) {
        setRoomId(res.data.id);
      }
    } catch (err) {
      setError("Failed to create room. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinCall = () => {
    if (!roomIdInputRef.current?.value) {
      setError("Please enter a room ID");
      return;
    }
    location.assign(`${CALL_PAGE_URL}/${roomIdInputRef.current.value}`);
  };

  const handleCopyLink = async () => {
    if (!roomId) return;

    const callLink = `${CALL_PAGE_URL}/${roomId}`;
    try {
      await navigator.clipboard.writeText(callLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      setError("Failed to copy link. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Video className="h-12 w-12 text-blue-500" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Video Call App
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create or join a room to start your video call
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm space-y-4">
            {roomId && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">
                      Room Created!
                    </p>
                    <p className="text-lg font-mono mt-1 text-blue-900">
                      {roomId}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`p-2 rounded-md transition-colors duration-200 ${
                      copySuccess
                        ? "bg-green-100 text-green-600"
                        : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                    }`}
                    title="Copy link to clipboard"
                  >
                    {copySuccess ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col space-y-2">
              <input
                ref={roomIdInputRef}
                type="text"
                defaultValue={roomId}
                placeholder="Enter Room ID"
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="flex flex-col space-y-4">
              <button
                onClick={handleJoinCall}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Users className="h-5 w-5 mr-2" />
                Join Call
              </button>

              <button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  isCreating
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                }`}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Creating Room...
                  </>
                ) : (
                  "Create New Room"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
