import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Emergency {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: [number, number];
  timestamp: Date;
  description: string;
  status: 'pending' | 'active' | 'resolved';
  assignedResponders?: string[];
}

export interface Agent {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy';
  location?: [number, number];
}

interface EmergencyState {
  // Core state
  currentEmergency: Emergency | null;
  emergencies: Emergency[];
  agents: Agent[];
  
  // UI state
  isRecording: boolean;
  isAIConnected: boolean;
  transcript: string;
  detectedLanguage: string;
  userLocation: [number, number] | null;
  
  // Actions
  setCurrentEmergency: (emergency: Emergency | null) => void;
  addEmergency: (emergency: Emergency) => void;
  updateEmergency: (id: string, updates: Partial<Emergency>) => void;
  setRecording: (recording: boolean) => void;
  setAIConnected: (connected: boolean) => void;
  setTranscript: (transcript: string) => void;
  setUserLocation: (location: [number, number] | null) => void;
  clearState: () => void;
}

export const useEmergencyStore = create<EmergencyState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentEmergency: null,
      emergencies: [],
      agents: [],
      isRecording: false,
      isAIConnected: false,
      transcript: '',
      detectedLanguage: 'en',
      userLocation: null,

      // Actions
      setCurrentEmergency: (emergency) => 
        set({ currentEmergency: emergency }, false, 'setCurrentEmergency'),

      addEmergency: (emergency) => 
        set((state) => ({ 
          emergencies: [...state.emergencies, emergency] 
        }), false, 'addEmergency'),

      updateEmergency: (id, updates) => 
        set((state) => ({
          emergencies: state.emergencies.map(e => 
            e.id === id ? { ...e, ...updates } : e
          ),
          currentEmergency: state.currentEmergency?.id === id 
            ? { ...state.currentEmergency, ...updates } 
            : state.currentEmergency
        }), false, 'updateEmergency'),

      setRecording: (recording) => 
        set({ isRecording: recording }, false, 'setRecording'),

      setAIConnected: (connected) => 
        set({ isAIConnected: connected }, false, 'setAIConnected'),

      setTranscript: (transcript) => 
        set({ transcript }, false, 'setTranscript'),

      setUserLocation: (location) => 
        set({ userLocation: location }, false, 'setUserLocation'),

      clearState: () => 
        set({
          currentEmergency: null,
          isRecording: false,
          transcript: '',
          detectedLanguage: 'en'
        }, false, 'clearState')
    }),
    { name: 'emergency-store' }
  )
);