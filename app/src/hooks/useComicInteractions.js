import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CONTROL_SELECTOR = 'button, a[href], [role="button"]';
const TAP_DURATION = 190;
const TAP_CLASSES = Array.from({ length: 6 }, (_, index) => `comic-tap-${index + 1}`);

export function useComicTouchFeedback() {
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 800px)');
    const replaying = new WeakSet();
    const pending = new WeakSet();
    const timers = new Set();
    let touchedControl = null;
    const findControl = (target) =>
      target instanceof Element ? target.closest(CONTROL_SELECTOR) : null;
    const rememberTouch = (event) => {
      touchedControl =
        event.pointerType === 'touch' || event.pointerType === 'pen'
          ? findControl(event.target)
          : null;
    };
    const clearTouch = () => {
      touchedControl = null;
    };
    const animateBeforeAction = (event) => {
      const control = findControl(event.target);
      if (!mobile.matches || !control || control !== touchedControl || replaying.has(control)) {
        if (control && replaying.has(control)) replaying.delete(control);
        return;
      }
      if (control.matches('[data-comic-option]')) {
        touchedControl = null;
        return;
      }
      touchedControl = null;
      if (control.matches(':disabled, [aria-disabled="true"]') || pending.has(control)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      pending.add(control);
      const variant = ((control.textContent?.length || control.tagName.length) % 6) + 1;
      control.classList.remove(...TAP_CLASSES);
      void control.offsetWidth;
      control.classList.add('comic-touching', `comic-tap-${variant}`);
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        pending.delete(control);
        control.classList.remove('comic-touching', `comic-tap-${variant}`);
        if (!control.isConnected) return;
        replaying.add(control);
        control.click();
      }, TAP_DURATION);
      timers.add(timer);
    };

    document.addEventListener('pointerdown', rememberTouch, true);
    document.addEventListener('pointercancel', clearTouch, true);
    document.addEventListener('click', animateBeforeAction, true);
    return () => {
      document.removeEventListener('pointerdown', rememberTouch, true);
      document.removeEventListener('pointercancel', clearTouch, true);
      document.removeEventListener('click', animateBeforeAction, true);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);
}

export function useMobileNavigationGestures() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!window.matchMedia('(max-width: 800px)').matches) return undefined;
    let start = null;
    const handlePointerDown = (event) => {
      const ignored = event.target.closest(
        'input, textarea, select, [data-no-swipe], .dashboard-funds, .money-lots',
      );
      if (event.pointerType !== 'touch' || ignored) return;
      if (event.clientX <= 28 || event.clientX >= window.innerWidth - 28) {
        start = {
          x: event.clientX,
          y: event.clientY,
          edge: event.clientX <= 28 ? 'left' : 'right',
        };
      }
    };
    const handlePointerUp = (event) => {
      if (!start) return;
      const horizontalDistance = event.clientX - start.x;
      const verticalDistance = Math.abs(event.clientY - start.y);
      const { edge } = start;
      start = null;
      if (verticalDistance > 55 || Math.abs(horizontalDistance) < 72) return;
      if (edge === 'left' && horizontalDistance > 0) {
        const closeButton = document.querySelector('.modal-close');
        if (closeButton) closeButton.click();
        else navigate(-1);
      }
      if (edge === 'right' && horizontalDistance < 0) navigate(1);
    };
    const cancelGesture = () => {
      start = null;
    };
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', cancelGesture, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', cancelGesture);
    };
  }, [navigate]);
}
