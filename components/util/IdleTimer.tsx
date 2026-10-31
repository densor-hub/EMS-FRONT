'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { AlertCircle, LogOut, CheckCircle, Loader2 } from 'lucide-react';
import { performInitialAuthCheck } from '@/lib/customAxios';

// ============================================================
// Config
// ============================================================
const IDLE_LIMIT_MS              = 5 * 60 * 1000;
const WARNING_AT_MS              = 30 * 1000;
const ACTIVITY_DEBOUNCE_MS       = 1000;
const IDLE_REFRESH_INTERVAL_MS   = 10 * 60 * 1000;
const REFRESH_REQUEST_TIMEOUT_MS = 15 * 1000;

// Cycle 1 at T+0 → logout lands at T+60:00 (exactly 1 hour of idleness).
const MAX_IDLE_REFRESH_CYCLES = 7;

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'touchmove',
  'click',
  'pointerdown',
];

type Phase = 'active' | 'warning' | 'inactive';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('refresh timeout')), ms)
    ),
  ]);
}

export default function IdleTimer() {
  const { isAuthenticated, userLogOut } = useAuth();

  const [phase, setPhase] = useState<Phase>('active');
  const [secondsLeft, setSecondsLeft] = useState(
    Math.floor(WARNING_AT_MS / 1000)
  );
  const [tickGeneration, setTickGeneration] = useState(0);
  const [isResuming, setIsResuming] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const lastActivityRef     = useRef<number>(Date.now());
  const tickRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLoggedSecondRef = useRef<number>(-1);
  const phaseRef            = useRef<Phase>('active');
  const hiddenAtRef         = useRef<number>(0);
  const idleCycleCountRef   = useRef<number>(0);
  const isLoggingOutRef     = useRef<boolean>(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ---------------------------------------------------------
  // Activity
  // ---------------------------------------------------------
  const handleActivity = useCallback(() => {
    if (phaseRef.current === 'inactive') return;
    if (isLoggingOutRef.current) return;

    const now = Date.now();
    const elapsed = now - lastActivityRef.current;
    if (elapsed < ACTIVITY_DEBOUNCE_MS) return;

    lastActivityRef.current = now;
    lastLoggedSecondRef.current = -1;

    if (phaseRef.current === 'warning') {
      setPhase('active');
      setSecondsLeft(Math.floor(WARNING_AT_MS / 1000));
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true })
    );

    document.addEventListener('scroll', handleActivity, {
      passive: true,
      capture: true,
    });

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, handleActivity)
      );
      document.removeEventListener('scroll', handleActivity, true);
    };
  }, [isAuthenticated, handleActivity]);

  // ---------------------------------------------------------
  // Visibility / lifecycle
  // ---------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated) return;

    const markHidden = () => {
      if (!hiddenAtRef.current) hiddenAtRef.current = Date.now();
    };

    const handleReturn = () => {
      const awayMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = 0;

      if (phaseRef.current === 'inactive') return;
      if (isLoggingOutRef.current) return;

      if (awayMs >= IDLE_LIMIT_MS) {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= IDLE_LIMIT_MS) {
          phaseRef.current = 'inactive';
          setPhase('inactive');
          if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
          }
        }
        return;
      }

      handleActivity();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') markHidden();
      else if (document.visibilityState === 'visible') handleReturn();
    };

    const onPageHide = () => markHidden();
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted || hiddenAtRef.current) handleReturn();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [isAuthenticated, handleActivity]);

  // ---------------------------------------------------------
  // Tick loop
  // ---------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated) return;

    tickRef.current = setInterval(() => {
      if (phaseRef.current === 'inactive') return;
      if (isLoggingOutRef.current) return;

      const elapsed      = Date.now() - lastActivityRef.current;
      const elapsedSec   = Math.floor(elapsed / 1000);
      const remainingMs  = IDLE_LIMIT_MS - elapsed;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      if (elapsed >= IDLE_LIMIT_MS) {
        phaseRef.current = 'inactive';
        setPhase('inactive');
        if (tickRef.current) {
          clearInterval(tickRef.current);
          tickRef.current = null;
        }
        return;
      }

      const inWarningWindow = remainingMs <= WARNING_AT_MS;

      if (inWarningWindow) {
        if (phaseRef.current !== 'warning') {
          phaseRef.current = 'warning';
          setPhase('warning');
        }
        if (elapsedSec !== lastLoggedSecondRef.current) {
          lastLoggedSecondRef.current = elapsedSec;
          setSecondsLeft(remainingSec);
        }
      } else if (phaseRef.current !== 'active') {
        phaseRef.current = 'active';
        setPhase('active');
      }
    }, 1000);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [isAuthenticated, tickGeneration]);

  // ---------------------------------------------------------
  // Idle refresh callback
  // ---------------------------------------------------------
  const callIdleRefresh = useCallback(async () => {
    try {
      await withTimeout(
        performInitialAuthCheck(true),
        REFRESH_REQUEST_TIMEOUT_MS
      );
      console.log('[IdleTimer] idle refresh ok at', new Date().toISOString());
      setAuthError(null);
    } catch (err) {
      console.warn(
        '[IdleTimer] idle refresh failed at',
        new Date().toISOString(),
        err
      );
      setAuthError(
        'Session refresh failed. You may need to log out and sign in again.'
      );
    }
  }, []);

  // ---------------------------------------------------------
  // Idle recurring loop + auto-logout at 1 hour
  // ---------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated) return;
    if (phase !== 'inactive') return;

    idleCycleCountRef.current = 0;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled) return;
      if (phaseRef.current !== 'inactive') return;
      if (isLoggingOutRef.current) return;

      idleCycleCountRef.current += 1;
      const cycle = idleCycleCountRef.current;

      if (cycle >= MAX_IDLE_REFRESH_CYCLES) {
        console.log(
          `[IdleTimer] reached ${cycle} idle cycles (~1 hour) — auto-logout`
        );
        cancelled = true;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        if (isLoggingOutRef.current) return;
        isLoggingOutRef.current = true;

        try {
          await userLogOut();
        } catch (err) {
          console.error('[IdleTimer] auto-logout failed:', err);
          if (typeof window !== 'undefined') window.location.reload();
        }
        return;
      }

      try {
        await callIdleRefresh();
      } catch (err) {
        console.warn('[IdleTimer] idle refresh tick threw:', err);
      } finally {
        if (!cancelled) {
          timer = setTimeout(tick, IDLE_REFRESH_INTERVAL_MS);
        }
      }
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
  }, [isAuthenticated, phase, callIdleRefresh, userLogOut]);

  // ---------------------------------------------------------
  // Reset on auth change
  // ---------------------------------------------------------
  useEffect(() => {
    phaseRef.current = 'active';
    setPhase('active');
    setSecondsLeft(Math.floor(WARNING_AT_MS / 1000));
    lastActivityRef.current = Date.now();
    lastLoggedSecondRef.current = -1;
    hiddenAtRef.current = 0;
    idleCycleCountRef.current = 0;
    setAuthError(null);

    if (!isAuthenticated) {
      setIsResuming(false);
      isLoggingOutRef.current = false;

      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    }
  }, [isAuthenticated]);

  // ---------------------------------------------------------
  // Button handlers
  // ---------------------------------------------------------
  const handleLogMeOut = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    try {
      await userLogOut();
    } catch (err) {
      console.error('[IdleTimer] manual logout failed:', err);
      if (typeof window !== 'undefined') window.location.reload();
    }
  }, [userLogOut]);

  // ✅ Resume now hits the auth/refresh endpoint (same as the loop)
  const handleIAmHere = useCallback(async () => {
    if (isResuming) return;
    if (isLoggingOutRef.current) return;

    setIsResuming(true);
    setAuthError(null);

    try {
      await withTimeout(
        performInitialAuthCheck(true),
        REFRESH_REQUEST_TIMEOUT_MS
      );

      phaseRef.current = 'active';
      lastActivityRef.current = Date.now();
      lastLoggedSecondRef.current = -1;
      hiddenAtRef.current = 0;
      idleCycleCountRef.current = 0;
      setSecondsLeft(Math.floor(WARNING_AT_MS / 1000));
      setPhase('active');

      setTickGeneration((g) => g + 1);
    } catch (err) {
      console.error('[IdleTimer] resume auth check failed:', err);
      setAuthError(
        err instanceof Error && err.message === 'refresh timeout'
          ? 'Could not verify your session (network slow). Try again, or log out.'
          : 'Could not verify your session. Try again, or log out.'
      );
    } finally {
      setIsResuming(false);
    }
  }, [isResuming]);

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
  if (!isAuthenticated) return null;

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
            Are you still there? Confirm to continue, or log out.
          </p>

          {authError && (
            <p
              role="alert"
              className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4"
            >
              {authError}
            </p>
          )}

          <div className="flex flex-row sm:flex-row gap-3">
            <Button
              onClick={handleIAmHere}
              disabled={isResuming}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold h-11"
            >
              {isResuming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  I Am Here
                </>
              )}
            </Button>
            <Button
              onClick={handleLogMeOut}
              disabled={isResuming}
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