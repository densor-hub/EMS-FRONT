'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { AlertCircle, LogOut, CheckCircle } from 'lucide-react';

// ============================================================
// TESTING VALUES — 2 minute idle limit, 30 second warning
// ============================================================
const IDLE_LIMIT_MS = 2 * 60 * 1000;   // 2 minutes (was 10 * 60 * 1000)
const WARNING_AT_MS = 30 * 1000;        // show warning 30s before limit

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
];

type Phase = 'active' | 'warning' | 'inactive';

export default function IdleTimer() {
  const { isAuthenticated, userLogOut } = useAuth();

  const [phase, setPhase] = useState<Phase>('active');
  const [secondsLeft, setSecondsLeft] = useState(
    Math.floor(WARNING_AT_MS / 1000)
  );

  const lastActivityRef = useRef<number>(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLoggedSecondRef = useRef<number>(-1);

  // Reset activity timestamp when the user interacts
  const handleActivity = useCallback(() => {
    if (phase === 'inactive') return;

    const now = Date.now();
    const elapsed = now - lastActivityRef.current;

    // Only log if it's been more than a second since the last activity,
    // otherwise mousemove spams the console.
    if (elapsed > 1000) {
      console.log(
        `[IdleTimer] Activity detected — resetting timer. Was idle for ${(elapsed / 1000).toFixed(1)}s`
      );
    }

    lastActivityRef.current = now;
    lastLoggedSecondRef.current = -1;

    if (phase === 'warning') {
      console.log('[IdleTimer] User returned during warning — back to active');
      setPhase('active');
      setSecondsLeft(Math.floor(WARNING_AT_MS / 1000));
    }
  }, [phase]);

  // Attach activity listeners while authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true })
    );

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, handleActivity)
      );
    };
  }, [isAuthenticated, handleActivity]);

  // Tick every second to compute remaining time
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log(
      `[IdleTimer] Started. Idle limit: ${IDLE_LIMIT_MS / 1000}s, warning at: ${(IDLE_LIMIT_MS - WARNING_AT_MS) / 1000}s`
    );

    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const elapsedSec = Math.floor(elapsed / 1000);
      const remainingMs = IDLE_LIMIT_MS - elapsed;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      // Log once per second only (guard against setInterval drift)
      if (elapsedSec !== lastLoggedSecondRef.current) {
        lastLoggedSecondRef.current = elapsedSec;

        const totalIdleSec = Math.floor(IDLE_LIMIT_MS / 1000);
        const isWarning = remainingMs <= WARNING_AT_MS;

        if (isWarning && remainingMs > 0) {
          console.log(
            `[IdleTimer] WARNING — ${remainingSec}s until inactive (idle: ${elapsedSec}s / ${totalIdleSec}s)`
          );
        } else if (remainingMs > 0) {
          console.log(
            `[IdleTimer] Active — idle: ${elapsedSec}s / ${totalIdleSec}s, remaining: ${remainingSec}s`
          );
        }
      }

      if (elapsed >= IDLE_LIMIT_MS) {
        console.log(
          `[IdleTimer] INACTIVE — idle limit reached (${elapsedSec}s). Showing overlay.`
        );
        setPhase('inactive');
        return;
      }

      if (remainingMs <= WARNING_AT_MS) {
        setPhase('warning');
        setSecondsLeft(remainingSec);
      } else if (phase !== 'inactive') {
        setPhase('active');
      }
    }, 1000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      console.log('[IdleTimer] Stopped (unmounted or logged out)');
    };
  }, [isAuthenticated, phase]);

  // Reset timer when user logs out or logs back in
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('[IdleTimer] User not authenticated — resetting');
      setPhase('active');
      setSecondsLeft(Math.floor(WARNING_AT_MS / 1000));
      lastActivityRef.current = Date.now();
      lastLoggedSecondRef.current = -1;
    } else {
      console.log('[IdleTimer] User authenticated — timer armed');
      lastActivityRef.current = Date.now();
      lastLoggedSecondRef.current = -1;
    }
  }, [isAuthenticated]);

  const handleLogMeOut = useCallback(async () => {
    console.log('[IdleTimer] Log Me Out clicked');
    await userLogOut();
  }, [userLogOut]);

  const handleIAmHere = useCallback(() => {
    console.log('[IdleTimer] I Am Here clicked — reloading page');
    window.location.reload();
  }, []);

  if (!isAuthenticated) return null;

  // Warning banner — last 30 seconds
  if (phase === 'warning') {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-sm sm:text-base">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="font-medium">
            Going into Inactive mode in {secondsLeft} second
            {secondsLeft === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    );
  }

  // Inactive overlay — idle limit reached
  if (phase === 'inactive') {
    return (
      <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 sm:p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            You have been inactive
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            Are you still there? You will be logged out if you don't respond.
          </p>

          <div className="flex flex-row sm:flex-row gap-3">
            <Button
              onClick={handleIAmHere}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold h-11"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              I Am Here
            </Button>
            <Button
              onClick={handleLogMeOut}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold h-11"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Me Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}