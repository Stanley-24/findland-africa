// User Intent Management Utility
// Handles saving and executing user intents after authentication

export interface UserIntent {
  action: 'buy' | 'chat' | 'purchase';
  property_id: string;
  property_title: string;
  agent_name?: string;
  agent_email?: string;
  timestamp: number;
}

export const saveUserIntent = (intent: UserIntent): void => {
  localStorage.setItem('userIntent', JSON.stringify(intent));
};

export const getUserIntent = (): UserIntent | null => {
  try {
    const intent = localStorage.getItem('userIntent');
    if (!intent) {
      return null;
    }
    
    const parsedIntent = JSON.parse(intent) as UserIntent;
    
    // Check if intent is not too old (24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (Date.now() - parsedIntent.timestamp > maxAge) {
      clearUserIntent();
      return null;
    }
    
    return parsedIntent;
  } catch (error) {
    console.error('Error parsing user intent:', error);
    clearUserIntent();
    return null;
  }
};

export const clearUserIntent = (): void => {
  localStorage.removeItem('userIntent');
};

export const executeUserIntent = (intent: UserIntent, navigate: (path: string) => void): void => {
  switch (intent.action) {
    case 'chat':
      if (intent.property_id) {
        // Navigate to property detail page and trigger chat
        navigate(`/properties/${intent.property_id}?action=chat`);
      } else {
        // General browsing intent - go to properties page
        navigate('/properties');
      }
      break;
    case 'buy':
    case 'purchase':
      if (intent.property_id) {
        // Navigate to property detail page and trigger buy modal
        navigate(`/properties/${intent.property_id}?action=buy`);
      } else {
        // General browsing intent - go to properties page
        navigate('/properties');
      }
      break;
    default:
      console.warn('Unknown user intent action:', intent.action);
      // Fallback to properties page
      navigate('/properties');
  }
  
  // Clear the intent after execution
  clearUserIntent();
};
