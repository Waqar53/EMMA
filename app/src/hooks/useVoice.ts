'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface VoiceState {
    isListening: boolean;
    isSpeaking: boolean;
    transcript: string;
    voiceEnabled: boolean;
    autoSpeak: boolean;
    selectedVoice: SpeechSynthesisVoice | null;
    availableVoices: SpeechSynthesisVoice[];
    volume: number;
    rate: number;
    pitch: number;
    error: string | null;
}

export function useVoice() {
    const [state, setState] = useState<VoiceState>({
        isListening: false,
        isSpeaking: false,
        transcript: '',
        voiceEnabled: true,
        autoSpeak: true,
        selectedVoice: null,
        availableVoices: [],
        volume: 1,
        rate: 0.95,
        pitch: 1.1,
        error: null,
    });

    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load available voices
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis?.getVoices() || [];
            const preferred = voices.find(v =>
                v.lang === 'en-GB' && v.name.toLowerCase().includes('female')
            ) || voices.find(v =>
                v.lang === 'en-GB'
            ) || voices.find(v =>
                v.lang.startsWith('en') && v.name.toLowerCase().includes('samantha')
            ) || voices.find(v =>
                v.lang.startsWith('en')
            ) || voices[0] || null;

            setState(s => ({ ...s, availableVoices: voices, selectedVoice: preferred }));
        };

        loadVoices();
        window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
        return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
    }, []);

    // Start listening (STT)
    const startListening = useCallback(() => {
        const w = window as any;
        const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            setState(s => ({ ...s, error: 'Speech recognition not supported. Use Chrome or Edge.' }));
            return;
        }

        // Stop any ongoing speech
        window.speechSynthesis?.cancel();

        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-GB';
        recognition.maxAlternatives = 1;

        let finalTranscript = '';

        recognition.onresult = (event: any) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }
            setState(s => ({ ...s, transcript: finalTranscript + interim }));

            // Reset silence timer — auto-stop after 2s of silence
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
                if (finalTranscript.trim()) {
                    recognition.stop();
                }
            }, 2000);
        };

        recognition.onend = () => {
            setState(s => ({ ...s, isListening: false }));
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };

        recognition.onerror = (event: any) => {
            if (event.error !== 'aborted' && event.error !== 'no-speech') {
                setState(s => ({ ...s, error: `Mic error: ${event.error}`, isListening: false }));
            } else {
                setState(s => ({ ...s, isListening: false }));
            }
        };

        recognitionRef.current = recognition;
        finalTranscript = '';
        setState(s => ({ ...s, isListening: true, transcript: '', error: null }));
        recognition.start();
    }, []);

    // Stop listening
    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setState(s => ({ ...s, isListening: false }));
    }, []);

    // Speak text (TTS)
    const speak = useCallback((text: string) => {
        if (!state.voiceEnabled || !state.autoSpeak) return;
        if (!window.speechSynthesis) {
            setState(s => ({ ...s, error: 'Speech synthesis not available' }));
            return;
        }

        // Cancel any current speech
        window.speechSynthesis.cancel();

        // Clean text for speech (remove markdown, emojis, etc.)
        const cleaned = text
            .replace(/[*_`#~\[\](){}|>]/g, '')
            .replace(/https?:\/\/\S+/g, '')
            .replace(/[^\w\s.,;:!?'-]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleaned) return;

        const utterance = new SpeechSynthesisUtterance(cleaned);
        if (state.selectedVoice) utterance.voice = state.selectedVoice;
        utterance.volume = state.volume;
        utterance.rate = state.rate;
        utterance.pitch = state.pitch;
        utterance.lang = 'en-GB';

        utterance.onstart = () => setState(s => ({ ...s, isSpeaking: true }));
        utterance.onend = () => setState(s => ({ ...s, isSpeaking: false }));
        utterance.onerror = () => setState(s => ({ ...s, isSpeaking: false }));

        synthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [state.voiceEnabled, state.autoSpeak, state.selectedVoice, state.volume, state.rate, state.pitch]);

    // Stop speaking
    const stopSpeaking = useCallback(() => {
        window.speechSynthesis?.cancel();
        setState(s => ({ ...s, isSpeaking: false }));
    }, []);

    // Toggle voice
    const toggleVoice = useCallback(() => {
        setState(s => {
            if (s.voiceEnabled) window.speechSynthesis?.cancel();
            return { ...s, voiceEnabled: !s.voiceEnabled };
        });
    }, []);

    // Toggle auto-speak
    const toggleAutoSpeak = useCallback(() => {
        setState(s => ({ ...s, autoSpeak: !s.autoSpeak }));
    }, []);

    // Set voice
    const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
        setState(s => ({ ...s, selectedVoice: voice }));
    }, []);

    // Set rate
    const setRate = useCallback((rate: number) => {
        setState(s => ({ ...s, rate }));
    }, []);

    return {
        ...state,
        startListening,
        stopListening,
        speak,
        stopSpeaking,
        toggleVoice,
        toggleAutoSpeak,
        setVoice,
        setRate,
    };
}
