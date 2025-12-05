from flask import Flask, render_template, request, jsonify, Response
from flask_cors import CORS
import requests
import json

app = Flask(__name__)
CORS(app)

class SanctiflowAssistant:
    def __init__(self, model="llama3.2", ollama_url="http://localhost:11434"):
        self.model = model
        self.ollama_url = ollama_url
    
    def check_ollama_connection(self):
        """Check if Ollama is running."""
        try:
            response = requests.get(f"{self.ollama_url}/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [model["name"] for model in models]
                if any(self.model in name for name in model_names):
                    return True, f"Model '{self.model}' ready!"
                else:
                    return False, f"Model '{self.model}' not found. Available: {model_names}"
            return False, "Could not retrieve models"
        except requests.exceptions.ConnectionError:
            return False, "Cannot connect to Ollama. Make sure it's running!"
    
    def chat(self, message):
        """Chat with AI about habits, health, and personal development."""
        try:
            enhanced_prompt = f"""
You are a supportive personal development assistant for SanctiFlow, an app that helps users track habits, health metrics, and personal growth. You are knowledgeable about:

- Habit formation and behavior change (referencing Atomic Habits by James Clear)
- Health and wellness (sleep, nutrition, exercise, hydration)
- Mental health and mood management
- Goal setting and accountability
- Personal development and self-improvement
- Time management and productivity
- Biblical principles and spiritual growth

Provide encouraging, practical advice. Be conversational and supportive. Keep responses concise (2-3 paragraphs max).

User question: {message}

Response:
"""
            
            payload = {
                "model": self.model,
                "prompt": enhanced_prompt,
                "stream": True
            }
            
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json=payload,
                timeout=120,
                stream=True
            )
            
            if response.status_code == 200:
                for line in response.iter_lines():
                    if line:
                        json_response = json.loads(line)
                        if "response" in json_response:
                            yield json_response["response"]
                        if json_response.get("done", False):
                            break
            else:
                yield f"Error: {response.status_code}"
                
        except requests.exceptions.Timeout:
            yield "The model is taking too long! Try again."
        except Exception as e:
            yield f"An error occurred: {str(e)}"

# Initialize assistant
assistant = SanctiflowAssistant()

@app.route('/api/chatbot/status', methods=['GET'])
def check_status():
    connected, message = assistant.check_ollama_connection()
    return jsonify({
        'connected': connected,
        'message': message
    })

@app.route('/api/chatbot/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message', '')
    
    if not message:
        return jsonify({'error': 'No message provided'}), 400
    
    def generate():
        for chunk in assistant.chat(message):
            yield chunk
    
    return Response(generate(), mimetype='text/plain')

if __name__ == '__main__':
    print("="*60)
    print("SANCTIFLOW CHATBOT - BACKEND SERVER")
    print("="*60)
    print("\nRequired setup:")
    print("1. Start Ollama: ollama serve")
    print("2. Install Llama 3.2: ollama pull llama3.2")
    print("3. Install Flask: pip install flask flask-cors")
    print("\nStarting chatbot server on http://localhost:5001")
    print("="*60)
    
    # Use port 5001 to avoid conflict with your existing server on 3000
    app.run(debug=True, port=5001)