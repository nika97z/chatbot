from flask import Flask, jsonify, request, send_from_directory
from openai import OpenAI
import os

app = Flask(__name__, static_folder='front', static_url_path='/static')

client = OpenAI(api_key="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")

SYSTEM_PROMPT = """
You are a professional AI consultant and chatbot developer assistant.

Your job is to help website owners and business managers understand
why having an AI chatbot on their website is useful.

You explain benefits such as:
- 24/7 customer support
- More sales
- Faster replies
- Lower support costs
- Better customer experience
- Automation

You speak in a friendly, confident, and professional tone.

You do NOT pressure users.
You educate them and guide them.

When appropriate, you encourage them to get a custom chatbot.

You can explain that custom bots can:
- Connect to databases
- Handle orders
- Book appointments
- Answer FAQs
- Integrate with Telegram, WhatsApp, and websites

If users show interest, invite them to discuss their project.

Always be clear, helpful, and trustworthy.
Keep answers concise but persuasive.
"""


# ===== Memory =====
chat_history = [
    {"role": "system", "content": SYSTEM_PROMPT}
]

MAX_MESSAGES = 20   # limit memory


def chatbot_response(user_input):

    global chat_history

    # Save user message
    chat_history.append({
        "role": "user",
        "content": user_input
    })

    # Limit memory size
    if len(chat_history) > MAX_MESSAGES:
        chat_history = chat_history[-MAX_MESSAGES:]

    # Send to OpenAI
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=chat_history,
        max_tokens=400,
        temperature=0.7
    )

    reply = response.choices[0].message.content

    # Save bot reply
    chat_history.append({
        "role": "assistant",
        "content": reply
    })

    return reply


# ===== Flask Routes =====
@app.route('/')
def serve_chat():
    """Serve the main chat interface"""
    return send_from_directory('front', 'chat.html')

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    """API endpoint for chat messages"""
    data = request.json
    user_message = data.get('message', '').strip()
    
    if not user_message:
        return jsonify({"error": "Empty message"}), 400
    
    try:
        reply = chatbot_response(user_message)
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files (CSS, JS)"""
    return send_from_directory('front', filename)

if __name__ == '__main__':
    print("🤖 Sales Bot Server Started on http://localhost:3000")
    app.run(debug=True, port=3000)