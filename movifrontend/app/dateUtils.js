export function formatTimestamp(timestamp, options = {}) {
  const defaultOptions = {
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };

  const dateOptions = { ...defaultOptions, ...options };
  return new Intl.DateTimeFormat('en-US', dateOptions).format(new Date(timestamp * 1000));
}