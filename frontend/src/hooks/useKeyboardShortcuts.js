import { useEffect } from 'react';

/**
 * Custom hook for managing keyboard shortcuts
 * @param {Object} shortcuts - Object mapping key combinations to handlers
 * @param {Array} dependencies - Dependencies array for the effect
 */
export function useKeyboardShortcuts(shortcuts, dependencies = []) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Build key combination string
      const keys = [];
      if (event.ctrlKey || event.metaKey) keys.push('ctrl');
      if (event.shiftKey) keys.push('shift');
      if (event.altKey) keys.push('alt');
      
      // Add the actual key
      const key = event.key.toLowerCase();
      if (key !== 'control' && key !== 'shift' && key !== 'alt' && key !== 'meta') {
        keys.push(key);
      }
      
      const combination = keys.join('+');
      
      // Check if this combination has a handler
      if (shortcuts[combination]) {
        // Prevent default browser behavior
        event.preventDefault();
        event.stopPropagation();
        
        // Call the handler
        shortcuts[combination](event);
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, ...dependencies]);
}

/**
 * Check if an element is a text input
 */
export function isTextInput(element) {
  if (!element) return false;
  
  const tagName = element.tagName.toLowerCase();
  const type = element.type?.toLowerCase();
  
  return (
    tagName === 'textarea' ||
    tagName === 'input' && (
      type === 'text' ||
      type === 'email' ||
      type === 'password' ||
      type === 'search' ||
      type === 'tel' ||
      type === 'url' ||
      type === 'number'
    ) ||
    element.isContentEditable
  );
}
