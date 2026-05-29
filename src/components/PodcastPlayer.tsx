import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, SkipForward, SkipBack, Loader2, Disc, Gauge, Sparkles } from "lucide-react";
import { PodcastEpisode } from "../types";

interface PodcastPlayerProps {
  currentEpisode: PodcastEpisode | null;
  isPlaying: boolean;
  onPlayPauseToggle: (playing: boolean) => void;
  playlist: PodcastEpisode[];
  onSelectEpisode: (episode: PodcastEpisode) => void;
}

export default function PodcastPlayer({
  currentEpisode,
  isPlaying,
  onPlayPauseToggle,
  playlist,
  onSelectEpisode,
}: PodcastPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Sync state with HTML5 audio
  useEffect(() => {
    if (!audioRef.current || !currentEpisode) return;

    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        setIsLoading(true);
        playPromise
          .then(() => {
            setIsLoading(false);
          })
          .catch((error) => {
            console.error("Audio playback error:", error);
            onPlayPauseToggle(false);
            setIsLoading(false);
          });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentEpisode?.audioUrl]);

  // Handle source changing
  useEffect(() => {
    if (audioRef.current && currentEpisode) {
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(() => {
          onPlayPauseToggle(false);
        });
      }
    }
  }, [currentEpisode?.audioUrl]);

  const handlePlayPause = () => {
    onPlayPauseToggle(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
    }
  };

  const changeSpeed = () => {
    const speeds = [1, 1.25, 1.5, 1.75, 2];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleSkip = (direction: "forward" | "back") => {
    if (!currentEpisode) return;
    const currentIndex = playlist.findIndex((ep) => ep.id === currentEpisode.id);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (direction === "forward") {
      nextIndex = (currentIndex + 1) % playlist.length;
    } else {
      nextIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    }
    onSelectEpisode(playlist[nextIndex]);
    onPlayPauseToggle(true);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!currentEpisode) {
    return null;
  }

  return (
    <div id="podcast-player-root" className="fixed bottom-0 left-0 w-full z-45 glass-nav border-t border-primary/10 shadow-2xl px-4 py-3 md:py-4 transition-all duration-300">
      <audio
        ref={audioRef}
        src={currentEpisode.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => onPlayPauseToggle(false)}
        className="hidden"
      />

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Track details */}
        <div id="player-track-details" className="flex items-center gap-3 w-full md:w-1/3">
          <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden shadow-inner flex-shrink-0 bg-secondary/10">
            <img
              src={currentEpisode.coverImage}
              alt={currentEpisode.title}
              className={`w-full h-full object-cover transition-transform duration-1000 ${
                isPlaying ? "scale-105" : "scale-100"
              }`}
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <Disc className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
          </div>
          
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-on-surface truncate leading-tight">
              {currentEpisode.title}
            </h4>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-on-surface-variant truncate">
              {currentEpisode.guestName ? (
                <>
                  <span className="font-medium text-primary">
                    {[currentEpisode.guestName2, currentEpisode.guestName3].filter(Boolean).length > 0 ? "Convidados:" : "Convidado:"}
                  </span>
                  <span className="truncate">
                    {[
                      { name: currentEpisode.guestName, role: currentEpisode.guestRole },
                      { name: currentEpisode.guestName2, role: currentEpisode.guestRole2 },
                      { name: currentEpisode.guestName3, role: currentEpisode.guestRole3 }
                    ]
                      .filter(g => g.name && g.name.trim() !== "")
                      .map(g => `${g.name}${g.role ? ` (${g.role})` : ""}`)
                      .join(", ")}
                  </span>
                </>
              ) : (
                <span>EP Solo · Com Eunice Vargas</span>
              )}
            </div>
          </div>
        </div>

        {/* Audio Controls & Timeline Slider */}
        <div id="player-core-controls" className="flex flex-col items-center gap-1.5 w-full md:w-2/3 max-w-xl">
          
          {/* Controls button row */}
          <div className="flex items-center gap-5">
            <button
              onClick={() => handleSkip("back")}
              aria-label="Previous Episode"
              className="text-secondary hover:text-primary transition-colors p-1"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={handlePlayPause}
              disabled={isLoading}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center hover:scale-105 transition-all shadow-md shadow-primary-container/20 disabled:scale-100 disabled:opacity-85"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white translate-x-[1px]" />
              )}
            </button>

            <button
              onClick={() => handleSkip("forward")}
              aria-label="Next Episode"
              className="text-secondary hover:text-primary transition-colors p-1"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Quick animated Sound Wave Visualizer when playing */}
            <div className="hidden sm:flex items-end gap-0.5 h-5 px-3">
              <span className={`w-[2.5px] bg-primary-container rounded ${isPlaying ? "wave-bar" : "h-1"}`} style={{ animationDuration: "1.2s", animationDelay: "0.1s" }} />
              <span className={`w-[2.5px] bg-primary-container rounded ${isPlaying ? "wave-bar" : "h-2.5"}`} style={{ animationDuration: "0.8s", animationDelay: "0.4s" }} />
              <span className={`w-[2.5px] bg-primary-container rounded ${isPlaying ? "wave-bar" : "h-1.5"}`} style={{ animationDuration: "1.0s", animationDelay: "0.2s" }} />
              <span className={`w-[2.5px] bg-primary-container rounded ${isPlaying ? "wave-bar" : "h-3"}`} style={{ animationDuration: "1.3s", animationDelay: "0.5s" }} />
              <span className={`w-[2.5px] bg-primary-container rounded ${isPlaying ? "wave-bar" : "h-1"}`} style={{ animationDuration: "0.7s", animationDelay: "0.3s" }} />
            </div>
          </div>

          {/* Progress timeline bar */}
          <div className="w-full flex items-center gap-3">
            <span className="text-[11px] font-medium text-ink-subtle w-8 text-right select-none">
              {formatTime(currentTime)}
            </span>
            
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 accent-primary-container h-1.5 bg-secondary/15 rounded-full cursor-pointer hover:accent-primary"
              style={{
                background: `linear-gradient(to right, #e8728a 0%, #e8728a ${duration ? (currentTime / duration) * 100 : 0}%, rgba(95, 94, 94, 0.15) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(95, 94, 94, 0.15) 100%)`
              }}
            />

            <span className="text-[11px] font-medium text-ink-subtle w-8 text-left select-none">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume & speed settings */}
        <div id="player-preferences" className="hidden lg:flex items-center justify-end gap-4 w-1/3">
          
          {/* Speed badge control */}
          <button
            onClick={changeSpeed}
            title="Alterar velocidade"
            className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/10 px-2 py-1 rounded-full transition-colors font-mono"
          >
            <Gauge className="w-3.5 h-3.5" />
            {playbackRate.toFixed(2)}x
          </button>

          {/* Volume slider */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
              className="text-secondary hover:text-primary transition-colors p-1"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-secondary/15 accent-primary rounded-full cursor-pointer"
            />
          </div>

          <div className="flex items-center text-xs text-primary font-medium gap-1 bg-surface-tint/30 text-tertiary px-2.5 py-1 rounded-md">
            <Sparkles className="w-3 h-3 text-tertiary" />
            <span>Som Original</span>
          </div>
        </div>

      </div>
    </div>
  );
}
