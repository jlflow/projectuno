const CHATBOT_API_URL = 'http://localhost:5001';
let isProcessing = false;
let hasMessages = false;

// Check chatbot status on page load
document.addEventListener('DOMContentLoaded', () => {
    checkChatbotStatus();
});

async function checkChatbotStatus() {
    const statusDot = document.getElementById('chatbot-status-dot');
    const statusText = document.getElementById('chatbot-status-text');
    
    try {
        const response = await fetch(`${CHATBOT_API_URL}/api/chatbot/status`);
        const data = await response.json();
        
        if (data.connected) {
            statusDot.className = 'status-dot connected';
            statusText.textContent = 'Online';
        } else {
            statusDot.className = 'status-dot disconnected';
            statusText.textContent = 'Offline';
            console.warn('Chatbot status:', data.message);
        }
    } catch (error) {
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Offline';
        console.error('Cannot connect to chatbot server:', error);
    }
}

// Handle form submission
document.getElementById('chatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message || isProcessing) return;
    
    sendMessage(message);
    input.value = '';
});

// Send suggestion chip
function sendSuggestion(message) {
    if (isProcessing) return;
    sendMessage(message);
}

// Main send message function
async function sendMessage(message) {
    if (isProcessing) return;
    
    isProcessing = true;
    document.getElementById('sendBtn').disabled = true;
    
    // Remove empty state if first message
    if (!hasMessages) {
        const emptyState = document.querySelector('.empty-chat-state');
        if (emptyState) emptyState.remove();
        hasMessages = true;
    }
    
    // Add user message
    addMessage(message, 'user');
    scrollToBottom();
    
    try {
        // Create bot message container
        const botMessage = createMessageElement('', 'bot');
        const messageContent = botMessage.querySelector('.message-content');
        const textDiv = messageContent.querySelector('div:last-child');
        
        // Stream response
        const response = await fetch(`${CHATBOT_API_URL}/api/chatbot/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            fullResponse += chunk;
            textDiv.textContent = fullResponse;
            scrollToBottom();
        }

    } catch (error) {
        console.error('Chat error:', error);
        addMessage('Sorry, I couldn\'t connect to the AI service. Please make sure Ollama is running!', 'bot');
    }
    
    isProcessing = false;
    document.getElementById('sendBtn').disabled = false;
}

// Create message element
function createMessageElement(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = type === 'user' ? 'You' : 'AI Coach';
    
    contentDiv.appendChild(label);
    
    const textNode = document.createElement('div');
    textNode.textContent = text;
    contentDiv.appendChild(textNode);
    
    messageDiv.appendChild(contentDiv);
    
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.appendChild(messageDiv);
    
    return messageDiv;
}

// Add message (simpler version)
function addMessage(text, type) {
    createMessageElement(text, type);
    scrollToBottom();
}

// Scroll to bottom
function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Optional: Handle Enter key for sending
document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('chatForm').dispatchEvent(new Event('submit'));
    }
});