import { useRef, useCallback, useEffect } from 'react';

export const useChatSound = () => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const thinkingOscillatorRef = useRef<OscillatorNode | null>(null);
    const thinkingGainRef = useRef<GainNode | null>(null);

    const initAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    const playSend = useCallback(() => {
        const ctx = initAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
    }, [initAudioContext]);

    const playReceive = useCallback(() => {
        const ctx = initAudioContext();

        // Simple chime (major triad arpeggio)
        const notes = [600, 750, 900]; // Approx C, E, G ranges
        notes.forEach((freq, index) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);

            gainNode.gain.setValueAtTime(0, ctx.currentTime + index * 0.1);
            gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + index * 0.1 + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.1 + 1.0);

            oscillator.start(ctx.currentTime + index * 0.1);
            oscillator.stop(ctx.currentTime + index * 0.1 + 1.2);
        });
    }, [initAudioContext]);

    const startThinking = useCallback(() => {
        if (thinkingOscillatorRef.current) return;
        const ctx = initAudioContext();

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);

        // LFO for pulsing effect
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 2; // 2Hz pulse
        lfo.connect(lfoGain);
        lfoGain.gain.value = 0.05; // Modulation depth
        // We can't easily modulate gain directly with another oscillator in simple WebAudio without more nodes, 
        // so let's just use a static low hum or simple repeated ping loop for simplicity.

        // Actually, let's just do a simple low volume continuous hum
        gainNode.gain.setValueAtTime(0.02, ctx.currentTime);

        oscillator.start();
        thinkingOscillatorRef.current = oscillator;
        thinkingGainRef.current = gainNode;
    }, [initAudioContext]);

    const stopThinking = useCallback(() => {
        if (thinkingOscillatorRef.current) {
            thinkingOscillatorRef.current.stop();
            thinkingOscillatorRef.current.disconnect();
            thinkingOscillatorRef.current = null;
        }
        if (thinkingGainRef.current) {
            thinkingGainRef.current.disconnect();
            thinkingGainRef.current = null;
        }
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            stopThinking();
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [stopThinking]);

    return { playSend, playReceive, startThinking, stopThinking };
};
