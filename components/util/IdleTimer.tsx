'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { AlertCircle, LogOut, CheckCircle, Loader2 } from 'lucide-react';
import { performInitialAuthCheck } from '@/lib/customAxios';
import { LoadingOverlay } from '../SkeletonLoading';

// ============================================================
// Idle config — 5 minute idle limit, 30 second warning.
// No auto-logout: the overlay waits for explicit user action.
// ============================================================
const IDLE_LIMIT_MS         = 5 * 60 * 1000;   // 5 minutes
const WARNING_AT_MS         = 30 * 1000;       // warn 30s before idle limit
const ACTIVITY_DEBOUNCE_MS  = 1000;            // ignore activity spam
const AUTH_CHECK_TIMEOUT_MS = 10 * 1000;       // give up after 10s

// touchmove/pointerdown help on iOS; scroll is handled separately
// with { capture: true } so inner scroll containers are covered.
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

export default function IdleTimer() {
  const { isAuthenticated, userLogOut } = useAuth();

  const [phase, setPhase] = useState<Phase>('active');
  const [secondsLeft, setSecondsLeft] = useState(
    Math.floor(WARNING_AT_MS / 1000)
  );
  const [tickGeneration, setTickGeneration] = useState(0);
  const [isResuming, setIsResuming] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Refs — stable values used inside closures that must not re-subscribe
  const lastActivityRef     = useRef<number>(Date.now());
  const tickRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLoggedSecondRef = useRef<number>(-1);
  const phaseRef            = useRef<Phase>('active');
  const hiddenAtRef         = useRef<number>(0);

  // Keep phaseRef in sync with phase state
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ---------------------------------------------------------
  // Activity handler — stable, no deps
  // ---------------------------------------------------------
  const handleActivity = useCallback(() => {
    if (phaseRef.current === 'inactive') return;

    const now = Date.now();
    const elapsed = now - lastActivityRef.current;

    // Debounce — ignore bursts of events (iOS fires touchstart → click)
    if (elapsed < ACTIVITY_DEBOUNCE_MS) return;

    lastActivityRef.current = now;
    lastLoggedSecondRef.current = -1;

    if (phaseRef.current === 'warning') {
      setPhase('active');
      setSecondsLeft(Math.floor(WARNING_AT_MS / 1000));
    }
  }, []);

  // ---------------------------------------------------------
  // Attach activity listeners ONCE while authenticated
  // ---------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated) return;

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true })
    );

    // Capture-phase scroll covers inner scroll containers too
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
  // Visibility / page lifecycle handling (iOS-friendly)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated) return;

    const markHidden = () => {
      // Don't overwrite if already set (multiple events fire)
      if (!hiddenAtRef.current) {
        hiddenAtRef.current = Date.now();
      }
    };

    const handleReturn = () => {
      const awayMs = hiddenAtRef.current
        ? Date.now() - hiddenAtRef.current
        : 0;
      hiddenAtRef.current = 0;

      // If already inactive, do nothing — overlay waits for user.
      if (phaseRef.current === 'inactive') return;

      // If they were away longer than the idle limit, trip immediately
      // rather than resetting.
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

      // Short away — treat as ordinary activity
      handleActivity();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        markHidden();
      } else if (document.visibilityState === 'visible') {
        handleReturn();
      }
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
      // Skip if we've already shown the overlay
      if (phaseRef.current === 'inactive') return;

      const elapsed      = Date.now() - lastActivityRef.current;
      const elapsedSec   = Math.floor(elapsed / 1000);
      const remainingMs  = IDLE_LIMIT_MS - elapsed;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      // Phase transitions are NOT rate-limited — only the per-second
      // countdown update is.
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
  // Reset when auth state changes
  // ---------------------------------------------------------
  useEffect(() => {
    phaseRef.current = 'active';
    setPhase('active');
    setSecondsLeft(Math.floor(WARNING_AT_MS / 1000));
    lastActivityRef.current = Date.now();
    lastLoggedSecondRef.current = -1;
    hiddenAtRef.current = 0;
    setAuthError(null);

    if (!isAuthenticated) {
      setIsResuming(false);
      setIsCheckingAuth(false);

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
    await userLogOut();
  }, [userLogOut]);

  const handleIAmHere = useCallback(async () => {
    // Guard against double-clicks / double-taps
    if (isResuming || isCheckingAuth) return;

    setIsResuming(true);
    setIsCheckingAuth(true);
    setAuthError(null);

    try {
      // Wrap auth check in a timeout so a flaky mobile network
      // can't leave the user staring at a spinner.
      await Promise.race([
        performInitialAuthCheck(true),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Auth check timed out')),
            AUTH_CHECK_TIMEOUT_MS
          )
        ),
      ]);

      // Session is healthy — reset idle timer synchronously.
      phaseRef.current = 'active';
      lastActivityRef.current = Date.now();
      lastLoggedSecondRef.current = -1;
      hiddenAtRef.current = 0;
      setSecondsLeft(Math.floor(WARNING_AT_MS / 1000));
      setPhase('active');

      // Re-arm the tick loop.
      setTickGeneration((g) => g + 1);
    } catch (err) {
      console.error('[IdleTimer] Auth check failed on resume:', err);
      // Surface the failure so the user isn't stuck silently.
      setAuthError(
        err instanceof Error && err.message.includes('timed out')
          ? 'Could not verify your session (network slow). Try again, or log out.'
          : 'Could not verify your session. Try again, or log out.'
      );
      // Overlay stays up — user can retry or log out manually.
    } finally {
      setIsCheckingAuth(false);
      setIsResuming(false);
    }
  }, [isResuming, isCheckingAuth]);

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
        {isCheckingAuth && <LoadingOverlay />}
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 sm:p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            You have been inactive
          </h2>
          {/* ✅ FIX: Copy no longer promises auto-logout — none happens */}
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            Are you still there? Confirm to continue, or log out.
          </p>

          {/* Visible error if the auth check failed */}
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
              disabled={isResuming || isCheckingAuth}
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
              disabled={isResuming || isCheckingAuth}
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