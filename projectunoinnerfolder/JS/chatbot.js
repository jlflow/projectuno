const CHATBOT_API_URL = 'http://localhost:5001';
let isProcessing = false;
let hasMessages = false;


document.addEventListener('DOMContentLoaded', () => {
    checkChatbotStatus();
});

// ANNOTATION 1: Arrow Function/Lambda (JavaScript equivalent to Python lambda)
// This async function acts as a lambda/anonymous function that checks the chatbot's 
// connection status by making an API call to the /api/chatbot/status endpoint.
// It fetches the status and updates the UI elements (status dot and text) based on 
// whether the chatbot is connected or not.
async function checkChatbotStatus() {
    const statusDot = document.getElementById('chatbot-status-dot');
    const statusText = document.getElementById('chatbot-status-text');
    
    // ANNOTATION 3: Exception Handling (try-catch block)
    // This try-catch block wraps the API call to handle any errors that might occur
    // during the fetch operation (such as network errors, server being down, or 
    // connection timeouts). If an error occurs, it catches the exception, sets the
    // status to 'Offline', updates the UI accordingly, and logs the error to the console
    // for debugging purposes.
    try {
        const response = await fetch(`${CHATBOT_API_URL}/api/chatbot/status`);
        const data = await response.json();
        
        // ANNOTATION 2: Conditional Statement (if-else)
        // This if-else statement checks the 'connected' property from the API response.
        // If data.connected is true, it sets the status dot to 'connected' class (green)
        // and displays "Online" text. If false, it sets the status dot to 'disconnected'
        // class (red/gray), displays "Offline" text, and logs a warning message with 
        // the reason from the API response.
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


document.getElementById('chatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message || isProcessing) return;
    
    sendMessage(message);
    input.value = '';
});


function sendSuggestion(message) {
    if (isProcessing) return;
    sendMessage(message);
}


async function sendMessage(message) {
    if (isProcessing) return;
    
    isProcessing = true;
    document.getElementById('sendBtn').disabled = true;
    
  
    if (!hasMessages) {
        const emptyState = document.querySelector('.empty-chat-state');
        if (emptyState) emptyState.remove();
        hasMessages = true;
    }
    
   
    addMessage(message, 'user');
    scrollToBottom();
    
    try {
        
        const botMessage = createMessageElement('', 'bot');
        const messageContent = botMessage.querySelector('.message-content');
        const textDiv = messageContent.querySelector('div:last-child');
        
        // ANNOTATION 4: API Methods Used to Connect the System
        // This code uses the Fetch API to connect to the chatbot backend system:
        // 1. fetch() - Makes an HTTP POST request to the endpoint ${CHATBOT_API_URL}/api/chatbot/chat
        // 2. method: 'POST' - Specifies the HTTP method as POST to send data to the server
        // 3. headers: {'Content-Type': 'application/json'} - Sets the request header to indicate JSON data
        // 4. body: JSON.stringify() - Converts the message object to JSON format for transmission
        // 5. response.body.getReader() - Gets a readable stream reader for streaming the response
        // 6. reader.read() - Reads chunks of data from the stream as they arrive
        // 7. TextDecoder().decode() - Decodes the binary stream data into readable text
        // This streaming approach allows real-time display of the AI's response as it's generated.
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


function addMessage(text, type) {
    createMessageElement(text, type);
    scrollToBottom();
}


function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('chatForm').dispatchEvent(new Event('submit'));
    }
});